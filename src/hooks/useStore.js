import { useState, useCallback, useEffect, useRef } from 'react'
import { localRepository } from '../data/localRepository'
import { flushSyncQueue } from '../data/syncClient'

/**
 * Generic CRUD hook backed by the local repository.
 * Each record must have an `id` field.
 */
export function useStore(key) {
  const [items, setItems] = useState(() => localRepository.list(key))
  const itemsRef = useRef(items)

  useEffect(() => {
    const current = localRepository.list(key)
    itemsRef.current = current
    setItems(current)

    return localRepository.subscribe(key, next => {
      itemsRef.current = next
      setItems(next)
    })
  }, [key])

  const queueMutations = useCallback((mutations) => {
    const list = Array.isArray(mutations) ? mutations : [mutations]
    const queued = list
      .filter(Boolean)
      .map(mutation => localRepository.queueMutation(key, mutation))
      .filter(Boolean)

    if (queued.length) {
      flushSyncQueue().catch(error => {
        console.warn('Sync queue flush failed:', error.message)
      })
    }
  }, [key])

  const persist = useCallback((updater, mutations) => {
    const prev = itemsRef.current
    const next = typeof updater === 'function' ? updater(prev) : updater
    const saved = localRepository.replaceAll(key, next)

    itemsRef.current = saved
    setItems(saved)

    const pending = typeof mutations === 'function' ? mutations(saved, prev) : mutations
    queueMutations(pending)

    return saved
  }, [key, queueMutations])

  const add = useCallback((item) => {
    const record = localRepository.buildInsert(item)
    persist(
      prev => [...prev, record],
      { op: 'upsert', recordId: record.id, record }
    )
    return record
  }, [persist])

  // Bulk insert: single atomic save, safe for large imports.
  const addMany = useCallback((newItems) => {
    const now = new Date().toISOString()
    const records = newItems.map(item => localRepository.buildInsert(item, now))

    persist(
      prev => [...prev, ...records],
      records.map(record => ({ op: 'upsert', recordId: record.id, record }))
    )

    return records
  }, [persist])

  const update = useCallback((id, patch) => {
    persist(
      prev => prev.map(item => item.id === id ? localRepository.buildUpdate(item, patch) : item),
      next => {
        const record = next.find(item => item.id === id)
        return record ? { op: 'upsert', recordId: id, record } : null
      }
    )
  }, [persist])

  const remove = useCallback((id) => {
    persist(
      prev => prev.filter(item => item.id !== id),
      (next, prev) => prev.some(item => item.id === id) ? { op: 'delete', recordId: id } : null
    )
  }, [persist])

  return { items, add, addMany, update, remove }
}
