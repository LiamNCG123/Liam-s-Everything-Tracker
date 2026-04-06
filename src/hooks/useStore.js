import { useState, useCallback } from 'react'
import { load, save, uid } from '../utils/storage'

/**
 * Generic CRUD hook backed by localStorage.
 * Each record must have an `id` field.
 */
export function useStore(key) {
  const [items, setItems] = useState(() => load(key) ?? [])

  // Functional updater — avoids stale-closure bugs when called in a loop
  const persist = useCallback((updater) => {
    setItems(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save(key, next)
      return next
    })
  }, [key])

  const add = useCallback((item) => {
    const record = { ...item, id: uid(), createdAt: new Date().toISOString() }
    persist(prev => [...prev, record])
    return record
  }, [persist])

  const update = useCallback((id, patch) => {
    persist(prev => prev.map(i => i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i))
  }, [persist])

  const remove = useCallback((id) => {
    persist(prev => prev.filter(i => i.id !== id))
  }, [persist])

  return { items, add, update, remove }
}
