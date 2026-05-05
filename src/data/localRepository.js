import { load, save, uid } from '../utils/storage'
import { isSyncableStore } from './storeRegistry'
import { enqueueMutation } from './syncQueue'

const listeners = new Map()

function normalizeRecords(value) {
  return Array.isArray(value) ? value : []
}

function notifyLater(key, records) {
  const notify = () => {
    const keyListeners = listeners.get(key)
    if (!keyListeners) return
    keyListeners.forEach(listener => listener(records))
  }

  if (typeof queueMicrotask === 'function') queueMicrotask(notify)
  else setTimeout(notify, 0)
}

export const localRepository = {
  list(key) {
    return normalizeRecords(load(key))
  },

  replaceAll(key, records) {
    const next = normalizeRecords(records)
    save(key, next)
    notifyLater(key, next)
    return next
  },

  buildInsert(item, now = new Date().toISOString()) {
    return {
      ...item,
      id: item.id ?? uid(),
      createdAt: item.createdAt ?? now,
    }
  },

  buildUpdate(item, patch, now = new Date().toISOString()) {
    return {
      ...item,
      ...patch,
      updatedAt: now,
    }
  },

  queueMutation(key, mutation) {
    if (!isSyncableStore(key)) return null

    return enqueueMutation({
      storeKey: key,
      ...mutation,
    })
  },

  subscribe(key, listener) {
    const keyListeners = listeners.get(key) ?? new Set()
    keyListeners.add(listener)
    listeners.set(key, keyListeners)

    return () => {
      keyListeners.delete(listener)
      if (keyListeners.size === 0) listeners.delete(key)
    }
  },
}
