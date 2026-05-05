const MAX_MUTATIONS = 500
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
      error: 'SYNC_WRITE_TOKEN is not configured. Refusing public writes.',
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

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}')

  const chunks = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function validateMutation(mutation) {
  if (!mutation || typeof mutation !== 'object') return 'Mutation must be an object.'
  if (!mutation.storeKey || typeof mutation.storeKey !== 'string') return 'Mutation is missing storeKey.'
  if (!mutation.recordId || typeof mutation.recordId !== 'string') return 'Mutation is missing recordId.'
  if (!['upsert', 'delete'].includes(mutation.op)) return 'Mutation op must be upsert or delete.'
  if (mutation.op === 'upsert' && (!mutation.record || typeof mutation.record !== 'object')) {
    return 'Upsert mutation is missing record payload.'
  }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Method not allowed.' })
  }

  const auth = requireSyncToken(req)
  if (!auth.ok) return send(res, auth.status, { error: auth.error })

  const supabase = getSupabaseConfig()
  if (!supabase.ok) return send(res, supabase.status, { error: supabase.error })

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return send(res, 400, { error: 'Invalid JSON body.' })
  }

  const mutations = Array.isArray(body.mutations) ? body.mutations : []
  if (!mutations.length) return send(res, 200, { acceptedMutationIds: [] })
  if (mutations.length > MAX_MUTATIONS) {
    return send(res, 413, { error: `Too many mutations. Max ${MAX_MUTATIONS} per push.` })
  }

  const invalid = mutations.map(validateMutation).find(Boolean)
  if (invalid) return send(res, 400, { error: invalid })

  const now = new Date().toISOString()
  const userId = process.env.SYNC_USER_ID || 'personal'
  const rows = mutations.map(mutation => ({
    user_id: userId,
    store_key: mutation.storeKey,
    record_id: mutation.recordId,
    payload: mutation.op === 'delete' ? null : mutation.record,
    deleted_at: mutation.op === 'delete' ? now : null,
    client_id: mutation.clientId || null,
    updated_at: mutation.queuedAt || now,
  }))

  const response = await fetch(
    `${supabase.url}/rest/v1/${TABLE}?on_conflict=user_id,store_key,record_id`,
    {
      method: 'POST',
      headers: {
        ...supabaseHeaders(supabase.serviceRoleKey),
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    }
  )

  if (!response.ok) {
    const details = await response.text()
    return send(res, response.status, {
      error: 'Supabase upsert failed.',
      details,
    })
  }

  return send(res, 200, {
    acceptedMutationIds: mutations.map(mutation => mutation.id),
  })
}
