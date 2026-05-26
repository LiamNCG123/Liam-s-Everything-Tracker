import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../sync/pull.js'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeReq(opts = {}) {
  return {
    method: opts.method ?? 'GET',
    headers: {
      'x-sync-token': opts.token ?? 'test-token-abc',
      ...opts.extraHeaders,
    },
  }
}

function makeRes() {
  let _status
  let _body
  return {
    status(code) {
      _status = code
      return this
    },
    json(data) {
      _body = data
    },
    get statusCode() {
      return _status
    },
    get body() {
      return _body
    },
  }
}

const SAMPLE_RECORDS = [
  {
    store_key: 'habits',
    record_id: 'h1',
    payload: { id: 'h1', name: 'Morning run' },
    deleted_at: null,
    updated_at: '2024-01-02T00:00:00.000Z',
  },
  {
    store_key: 'goals',
    record_id: 'g1',
    payload: null,
    deleted_at: '2024-01-03T00:00:00.000Z',
    updated_at: '2024-01-03T00:00:00.000Z',
  },
]

function setEnv(vars) {
  for (const [k, v] of Object.entries(vars)) process.env[k] = v
}

function clearEnv() {
  for (const k of ['SYNC_WRITE_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SYNC_USER_ID'])
    delete process.env[k]
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/sync/pull', () => {
  beforeEach(() => {
    setEnv({
      SYNC_WRITE_TOKEN: 'test-token-abc',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-xyz',
      SYNC_USER_ID: 'test-user',
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => SAMPLE_RECORDS,
      })
    )
  })

  afterEach(() => {
    clearEnv()
    vi.unstubAllGlobals()
  })

  // ── HTTP method ─────────────────────────────────────────────────────────────

  it('returns 405 for POST requests', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'POST' }), res)
    expect(res.statusCode).toBe(405)
  })

  it('returns 405 for DELETE requests', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'DELETE' }), res)
    expect(res.statusCode).toBe(405)
  })

  // ── auth ────────────────────────────────────────────────────────────────────

  it('returns 501 when SYNC_WRITE_TOKEN env var is not set', async () => {
    delete process.env.SYNC_WRITE_TOKEN
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res.statusCode).toBe(501)
  })

  it('returns 401 when x-sync-token does not match', async () => {
    const res = makeRes()
    await handler(makeReq({ token: 'wrong-token' }), res)
    expect(res.statusCode).toBe(401)
    expect(res.body.error).toMatch(/invalid sync token/i)
  })

  it('accepts a valid token via Authorization: Bearer header', async () => {
    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer test-token-abc' },
    }
    const res = makeRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
  })

  // ── Supabase config ─────────────────────────────────────────────────────────

  it('returns 501 when SUPABASE_URL is not set', async () => {
    delete process.env.SUPABASE_URL
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res.statusCode).toBe(501)
  })

  it('returns 501 when SUPABASE_SERVICE_ROLE_KEY is not set', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res.statusCode).toBe(501)
  })

  // ── successful pull ─────────────────────────────────────────────────────────

  it('returns 200 with records from Supabase', async () => {
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.records).toEqual(SAMPLE_RECORDS)
  })

  it('returns an empty records array when Supabase returns []', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      })
    )

    const res = makeRes()
    await handler(makeReq(), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.records).toEqual([])
  })

  it('calls Supabase with the correct URL and user_id filter', async () => {
    const res = makeRes()
    await handler(makeReq(), res)

    expect(fetch).toHaveBeenCalledOnce()
    const [url] = fetch.mock.calls[0]
    expect(url).toContain('https://example.supabase.co/rest/v1/sync_records')
    expect(url).toContain('user_id=eq.test-user')
    expect(url).toContain('select=')
  })

  it('includes the required columns in the select param', async () => {
    const res = makeRes()
    await handler(makeReq(), res)

    const [url] = fetch.mock.calls[0]
    expect(url).toContain('store_key')
    expect(url).toContain('record_id')
    expect(url).toContain('payload')
    expect(url).toContain('deleted_at')
    expect(url).toContain('updated_at')
  })

  it('uses SYNC_USER_ID=personal as default when env var is unset', async () => {
    delete process.env.SYNC_USER_ID
    const res = makeRes()
    await handler(makeReq(), res)

    const [url] = fetch.mock.calls[0]
    expect(url).toContain('user_id=eq.personal')
  })

  it('sends the service role key in the apikey header', async () => {
    const res = makeRes()
    await handler(makeReq(), res)

    const [, options] = fetch.mock.calls[0]
    expect(options.headers.apikey).toBe('service-role-key-xyz')
  })

  // ── Supabase error handling ─────────────────────────────────────────────────

  it('returns the Supabase error status when the pull fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal error' }),
      })
    )

    const res = makeRes()
    await handler(makeReq(), res)
    expect(res.statusCode).toBe(500)
    expect(res.body.error).toMatch(/supabase pull failed/i)
  })

  it('handles a non-array Supabase response by returning an empty records array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => null,
      })
    )

    const res = makeRes()
    await handler(makeReq(), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.records).toEqual([])
  })
})
