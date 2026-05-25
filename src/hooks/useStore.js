import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase/client'
import { uid } from '../utils/storage'
import { useAuth } from '../context/AuthContext'

/**
 * Generic CRUD hook backed by Supabase (sync_records table).
 * API is identical to the old localStorage version — all pages work unchanged.
 * Writes are optimistic: UI updates instantly, Supabase persists in the background.
 */
export function useStore(key) {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const itemsRef = useRef([])

  // Keep ref in sync so callbacks always read the latest items without stale closure
  const commit = (next) => {
    itemsRef.current = next
    setItems(next)
  }

  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      commit([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from('sync_records')
      .select('payload')
      .eq('user_id', userId)
      .eq('store_key', key)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error(`[useStore:${key}] fetch failed:`, error.message)
        } else {
          commit((data || []).map(r => r.payload))
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [userId, key, authLoading])

  const add = useCallback(async (item) => {
    if (!userId) return
    const record = { id: uid(), createdAt: new Date().toISOString(), ...item }
    commit([...itemsRef.current, record])

    const { error } = await supabase.from('sync_records').insert({
      user_id: userId,
      store_key: key,
      record_id: record.id,
      payload: record,
    })
    if (error) {
      console.error(`[useStore:${key}] add failed:`, error.message)
      commit(itemsRef.current.filter(r => r.id !== record.id))
    }
    return record
  }, [userId, key])

  const addMany = useCallback(async (newItems) => {
    if (!userId) return []
    const now = new Date().toISOString()
    const records = newItems.map(item => ({ id: uid(), createdAt: now, ...item }))
    commit([...itemsRef.current, ...records])

    const { error } = await supabase.from('sync_records').insert(
      records.map(r => ({ user_id: userId, store_key: key, record_id: r.id, payload: r }))
    )
    if (error) {
      console.error(`[useStore:${key}] addMany failed:`, error.message)
      const ids = new Set(records.map(r => r.id))
      commit(itemsRef.current.filter(r => !ids.has(r.id)))
    }
    return records
  }, [userId, key])

  const update = useCallback(async (id, patch) => {
    if (!userId) return
    const now = new Date().toISOString()
    const next = itemsRef.current.map(item =>
      item.id === id ? { ...item, ...patch, updatedAt: now } : item
    )
    commit(next)
    const updated = next.find(r => r.id === id)
    if (!updated) return

    const { error } = await supabase.from('sync_records')
      .update({ payload: updated, updated_at: now })
      .eq('user_id', userId)
      .eq('store_key', key)
      .eq('record_id', id)
    if (error) console.error(`[useStore:${key}] update failed:`, error.message)
  }, [userId, key])

  const remove = useCallback(async (id) => {
    if (!userId) return
    const prev = itemsRef.current
    commit(prev.filter(item => item.id !== id))

    const { error } = await supabase.from('sync_records')
      .delete()
      .eq('user_id', userId)
      .eq('store_key', key)
      .eq('record_id', id)
    if (error) {
      console.error(`[useStore:${key}] remove failed:`, error.message)
      commit(prev)
    }
  }, [userId, key])

  return { items, loading, add, addMany, update, remove }
}
