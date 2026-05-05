const TABLE = 'sync_records'

function send(res, status, body) {
  res.status(status).json(body)
}

function getHeader(req, name) {
  const value = req.headers[name.toLowerCase()] ?? req.headers[name]
  return Array.isArray(value) ? value[0] : value
}

function requireSyncToken(req) {
  const expected = process.env.SYNC_WRITE_TOKEN
  if (!expected) {
    return {
      ok: false,
      status: 501,
      error: 'SYNC_WRITE_TOKEN is not configured. Refusing public reads.',
    }
  }

  const bearer = (getHeader(req, 'authorization') || '').replace(/^Bearer\s+/i, '')
  const token = getHeader(req, 'x-sync-token') || bearer

  if (token !== expected) {
    return { ok: false, status: 401, error: 'Invalid sync token.' }
  }

  return { ok: true }
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return {
      ok: false,
      status: 501,
      error: 'Supabase sync is not configured.',
    }
  }

  return { ok: true, url, serviceRoleKey }
}

function supabaseHeaders(key) {
  const headers = {
    apikey: key,
    'user-agent': 'spora-sync-api/1.0',
  }

  if (!key.startsWith('sb_secret_') && !key.startsWith('sb_publishable_')) {
    headers.authorization = `Bearer ${key}`
  }

  return headers
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { error: 'Method not allowed.' })
  }

  const auth = requireSyncToken(req)
  if (!auth.ok) return send(res, auth.status, { error: auth.error })

  const supabase = getSupabaseConfig()
  if (!supabase.ok) return send(res, supabase.status, { error: supabase.error })

  const userId = encodeURIComponent(process.env.SYNC_USER_ID || 'personal')
  const response = await fetch(
    `${supabase.url}/rest/v1/${TABLE}?select=store_key,record_id,payload,deleted_at,updated_at&user_id=eq.${userId}`,
    {
      headers: supabaseHeaders(supabase.serviceRoleKey),
    }
  )

  const result = await response.json().catch(() => null)
  if (!response.ok) {
    return send(res, response.status, {
      error: 'Supabase pull failed.',
      details: result,
    })
  }

  return send(res, 200, {
    records: Array.isArray(result) ? result : [],
  })
}
