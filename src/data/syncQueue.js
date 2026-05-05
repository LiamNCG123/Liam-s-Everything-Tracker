import { load, save, uid } from '../utils/storage'

const QUEUE_KEY = 'syncQueue'
const CLIENT_ID_KEY = 'syncClientId'
const MAX_QUEUE_ITEMS = 1000

export function getSyncClientId() {
  const existing = load(CLIENT_ID_KEY)
  if (existing) return existing

  const clientId = uid()
  save(CLIENT_ID_KEY, clientId)
  return clientId
}

export function loadSyncQueue() {
  const queue = load(QUEUE_KEY)
  return Array.isArray(queue) ? queue : []
}

export function enqueueMutation(mutation) {
  const queued = {
    id: uid(),
    clientId: getSyncClientId(),
    queuedAt: new Date().toISOString(),
    ...mutation,
  }

  const next = [...loadSyncQueue(), queued].slice(-MAX_QUEUE_ITEMS)
  save(QUEUE_KEY, next)
  return queued
}

export function clearSyncedMutations(ids) {
  if (!ids?.length) return

  const synced = new Set(ids)
  const next = loadSyncQueue().filter(mutation => !synced.has(mutation.id))
  save(QUEUE_KEY, next)
}

export function resetSyncQueue() {
  save(QUEUE_KEY, [])
}
