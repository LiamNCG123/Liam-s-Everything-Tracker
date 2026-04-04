import { useState, useCallback } from 'react'
import { load, save, uid } from '../utils/storage'

/**
 * Generic CRUD hook backed by localStorage.
 * Each record must have an `id` field.
 */
export function useStore(key) {
  const [items, setItems] = useState(() => load(key) ?? [])

  const persist = useCallback((next) => {
    setItems(next)
    save(key, next)
  }, [key])

  const add = useCallback((item) => {
    const record = { ...item, id: uid(), createdAt: new Date().toISOString() }
    persist([...items, record])
    return record
  }, [items, persist])

  const update = useCallback((id, patch) => {
    persist(items.map(i => i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i))
  }, [items, persist])

  const remove = useCallback((id) => {
    persist(items.filter(i => i.id !== id))
  }, [items, persist])

  return { items, add, update, remove }
}
