import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../sync/push.js'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeReq(opts = {}) {
  return {
    method: opts.method ?? 'POST',
    headers: {
      'x-sync-token': opts.token ?? 'test-token-abc',
      ...opts.extraHeaders,
    },
    body: opts.body ?? null,
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

const VALID_MUTATION = {
  id: 'mut-1',
  clientId: 'client-1',
  queuedAt: '2024-01-01T00:00:00.000Z',
  storeKey: 'habits',
  recordId: 'rec-1',
  op: 'upsert',
  record: { id: 'rec-1', name: 'Morning run' },
}

function setEnv(vars) {
  for (const [k, v] of Object.entries(vars)) process.env[k] = v
}

function clearEnv() {
  for (const k of ['SYNC_WRITE_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SYNC_USER_ID'])
    delete process.env[k]
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/sync/push', () => {
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
        text: async () => '',
      })
    )
  })

  afterEach(() => {
    clearEnv()
    vi.unstubAllGlobals()
  })

  // ── HTTP method ─────────────────────────────────────────────────────────────

  it('returns 405 for GET requests', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'GET' }), res)
    expect(res.statusCode).toBe(405)
  })

  it('returns 405 for PATCH requests', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'PATCH' }), res)
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
      method: 'POST',
      headers: { authorization: 'Bearer test-token-abc' },
      body: { mutations: [] },
    }
    const res = makeRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
  })

  // ── Supabase config ─────────────────────────────────────────────────────────

  it('returns 501 when SUPABASE_URL is not set', async () => {
    delete process.env.SUPABASE_URL
    const res = makeRes()
    await handler(makeReq({ body: { mutations: [VALID_MUTATION] } }), res)
    expect(res.statusCode).toBe(501)
    expect(res.body.error).toMatch(/not configured/i)
  })

  it('returns 501 when SUPABASE_SERVICE_ROLE_KEY is not set', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const res = makeRes()
    await handler(makeReq({ body: { mutations: [VALID_MUTATION] } }), res)
    expect(res.statusCode).toBe(501)
  })

  // ── empty mutations ─────────────────────────────────────────────────────────

  it('returns 200 with empty acceptedMutationIds for no mutations', async () => {
    const res = makeRes()
    await handler(makeReq({ body: { mutations: [] } }), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.acceptedMutationIds).toEqual([])
  })

  it('treats a missing mutations field as an empty list', async () => {
    const res = makeRes()
    await handler(makeReq({ body: {} }), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.acceptedMutationIds).toEqual([])
  })

  // ── mutation validation ─────────────────────────────────────────────────────

  it('returns 400 when storeKey is missing', async () => {
    const bad = { ...VALID_MUTATION, storeKey: undefined }
    const res = makeRes()
    await handler(makeReq({ body: { mutations: [bad] } }), res)
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/storeKey/i)
  })

  it('returns 400 when recordId is missing', async () => {
    const bad = { ...VALID_MUTATION, recordId: undefined }
    const res = makeRes()
    await handler(makeReq({ body: { mutations: [bad] } }), res)
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/recordId/i)
  })

  it('returns 400 when op is not upsert or delete', async () => {
    const bad = { ...VALID_MUTATION, op: 'patch' }
    const res = makeRes()
    await handler(makeReq({ body: { mutations: [bad] } }), res)
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/op must be upsert or delete/i)
  })

  it('returns 400 when upsert mutation has no record payload', async () => {
    const bad = { ...VALID_MUTATION, record: undefined }
    const res = makeRes()
    await handler(makeReq({ body: { mutations: [bad] } }), res)
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/record payload/i)
  })

  it('returns 413 when more than 500 mutations are sent', async () => {
    const mutations = Array.from({ length: 501 }, (_, i) => ({
      ...VALID_MUTATION,
      id: `mut-${i}`,
      recordId: `rec-${i}`,
    }))
    const res = makeRes()
    await handler(makeReq({ body: { mutations } }), res)
    expect(res.statusCode).toBe(413)
  })

  // ── successful upsert ───────────────────────────────────────────────────────

  it('returns 200 with acceptedMutationIds on success', async () => {
    const res = makeRes()
    await handler(makeReq({ body: { mutations: [VALID_MUTATION] } }), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.acceptedMutationIds).toEqual(['mut-1'])
  })

  it('returns all mutation IDs when multiple mutations succeed', async () => {
    const m2 = { ...VALID_MUTATION, id: 'mut-2', recordId: 'rec-2' }
    const res = makeRes()
    await handler(makeReq({ body: { mutations: [VALID_MUTATION, m2] } }), res)
    expect(res.body.acceptedMutationIds).toEqual(['mut-1', 'mut-2'])
  })

  it('calls Supabase with the correct URL and method', async () => {
    const res = makeRes()
    await handler(makeReq({ body: { mutations: [VALID_MUTATION] } }), res)

    expect(fetch).toHaveBeenCalledOnce()
    const [url, options] = fetch.mock.calls[0]
    expect(url).toContain('https://example.supabase.co/rest/v1/sync_records')
    expect(options.method).toBe('POST')
    expect(options.headers['content-type']).toBe('application/json')
  })

  it('maps mutation fields to Supabase row shape', async () => {
    const res = makeRes()
    await handler(makeReq({ body: { mutations: [VALID_MUTATION] } }), res)

    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      user_id: 'test-user',
      store_key: 'habits',
      record_id: 'rec-1',
      payload: VALID_MUTATION.record,
      deleted_at: null,
      client_id: 'client-1',
    })
  })

  it('uses SYNC_USER_ID=personal as the default when the env var is unset', async () => {
    delete process.env.SYNC_USER_ID
    const res = makeRes()
    await handler(makeReq({ body: { mutations: [VALID_MUTATION] } }), res)

    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body[0].user_id).toBe('personal')
  })

  // ── delete mutations ────────────────────────────────────────────────────────

  it('sets payload to null and deleted_at to a timestamp for delete mutations', async () => {
    const deleteMutation = {
      id: 'mut-del',
      clientId: 'c1',
      queuedAt: '2024-01-01T00:00:00.000Z',
      storeKey: 'habits',
      recordId: 'rec-del',
      op: 'delete',
    }
    const res = makeRes()
    await handler(makeReq({ body: { mutations: [deleteMutation] } }), res)

    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body[0].payload).toBeNull()
    expect(body[0].deleted_at).toBeTruthy()
  })

  // ── Supabase error handling ─────────────────────────────────────────────────

  it('forwards the Supabase error status and message when the upsert fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })
    )

    const res = makeRes()
    await handler(makeReq({ body: { mutations: [VALID_MUTATION] } }), res)
    expect(res.statusCode).toBe(500)
    expect(res.body.error).toMatch(/supabase upsert failed/i)
    expect(res.body.details).toBe('Internal Server Error')
  })

  it('handles invalid JSON body with a 400', async () => {
    const req = {
      method: 'POST',
      headers: { 'x-sync-token': 'test-token-abc' },
      body: 'not-json',
    }
    const res = makeRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })
})
