import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase/client'
import { load, save, uid } from '../utils/storage'
import { useAuth } from '../context/AuthContext'

const STORE_KEYS = [
  'habits', 'habitAnnotations', 'goals', 'training', 'programmes',
  'education', 'financeTransactions', 'monthlyBudgets',
  'transactionImportBatches', 'categorizationRules',
  'dailyHighlights', 'dailyCheckins', 'monthlyReviews',
]

export function useLocalMigration() {
  const { user, loading: authLoading } = useAuth()
  const ran = useRef(false)

  useEffect(() => {
    if (authLoading || !user || ran.current) return
    if (load('migrationDone')) return

    ran.current = true

    const allLocalData = STORE_KEYS
      .map(key => ({ key, items: load(key) || [] }))
      .filter(s => s.items.length > 0)

    if (!allLocalData.length) {
      save('migrationDone', true)
      return
    }

    const migrate = async () => {
      // Only migrate if Supabase has no records yet (avoid overwriting)
      const { count } = await supabase
        .from('sync_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (count > 0) {
        save('migrationDone', true)
        return
      }

      const now = new Date().toISOString()

      for (const { key, items } of allLocalData) {
        const rows = items.map(item => {
          const id = item.id ?? uid()
          return {
            user_id: user.id,
            store_key: key,
            record_id: id,
            payload: { id, createdAt: item.createdAt ?? now, ...item },
          }
        })

        if (rows.length) {
          const { error } = await supabase.from('sync_records').insert(rows)
          if (error) console.error(`[migration] failed for ${key}:`, error.message)
        }
      }

      // Also sync display_name to profile if not already set
      const localName = load('userName')
      if (localName) {
        await supabase
          .from('profiles')
          .update({ display_name: localName })
          .eq('id', user.id)
          .is('display_name', null)
      }

      save('migrationDone', true)
      console.info('[migration] Local data migrated to Supabase successfully.')
    }

    migrate()
  }, [authLoading, user])
}
