import { clearSyncedMutations, loadSyncQueue } from './syncQueue'

const SYNC_ENABLED = import.meta.env.VITE_SYNC_ENABLED === 'true'
const SYNC_WRITE_TOKEN = import.meta.env.VITE_SYNC_WRITE_TOKEN || ''

let inFlight = null

export function isSyncEnabled() {
  return SYNC_ENABLED
}

export async function flushSyncQueue() {
  if (!SYNC_ENABLED || typeof fetch !== 'function') {
    return { skipped: true, reason: 'disabled' }
  }

  const mutations = loadSyncQueue()
  if (!mutations.length) return { ok: true, pushed: 0 }

  if (inFlight) return inFlight

  inFlight = (async () => {
    const response = await fetch('/api/sync/push', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        ...(SYNC_WRITE_TOKEN ? { 'x-sync-token': SYNC_WRITE_TOKEN } : {}),
      },
      body: JSON.stringify({ mutations }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(result.error || `Sync failed with ${response.status}`)
    }

    const acceptedMutationIds = result.acceptedMutationIds || mutations.map(mutation => mutation.id)
    clearSyncedMutations(acceptedMutationIds)
    return { ...result, pushed: acceptedMutationIds.length }
  })().finally(() => {
    inFlight = null
  })

  return inFlight
}

export async function pullRemoteSnapshot() {
  if (!SYNC_ENABLED || typeof fetch !== 'function') {
    return { skipped: true, reason: 'disabled', records: [] }
  }

  const response = await fetch('/api/sync/pull', {
    credentials: 'include',
    headers: {
      ...(SYNC_WRITE_TOKEN ? { 'x-sync-token': SYNC_WRITE_TOKEN } : {}),
    },
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result.error || `Sync pull failed with ${response.status}`)
  }

  return result
}
