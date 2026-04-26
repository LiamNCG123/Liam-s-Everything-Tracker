import { createContext, useContext, useState } from 'react'
import { load, save } from '../utils/storage'

export const ALL_MODULES = [
  { key: 'habits',    label: 'Habits',    emoji: '✅', path: '/habits'    },
  { key: 'training',  label: 'Training',  emoji: '💪', path: '/training'  },
  { key: 'finance',   label: 'Finance',   emoji: '💰', path: '/finance'   },
  { key: 'goals',     label: 'Goals',     emoji: '🎯', path: '/goals'     },
  { key: 'education', label: 'Learning', emoji: '📚', path: '/education' },
]

const DEFAULT_ORDER = ALL_MODULES.map(m => m.key)
const DEFAULT_ENABLED = DEFAULT_ORDER.reduce((acc, k) => ({ ...acc, [k]: true }), {})

function initialSettings() {
  const saved = load('moduleSettings')
  if (saved) return saved

  // Pre-populate enabled state from onboarding focuses
  const focuses = load('userFocuses')
  if (focuses?.length) {
    const keyMap = { money: 'finance', learning: 'education' }
    const enabledSet = new Set(focuses.map(k => keyMap[k] ?? k))
    return {
      order: DEFAULT_ORDER,
      enabled: DEFAULT_ORDER.reduce((acc, k) => ({ ...acc, [k]: enabledSet.has(k) }), {}),
    }
  }

  return { order: DEFAULT_ORDER, enabled: DEFAULT_ENABLED }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ModulesContext = createContext(null)

export function ModulesProvider({ children }) {
  const [settings, setSettings] = useState(initialSettings)

  const persist = (next) => { setSettings(next); save('moduleSettings', next) }

  const toggle = (key) => persist({
    ...settings,
    enabled: { ...settings.enabled, [key]: !settings.enabled[key] },
  })

  const moveUp = (key) => {
    const idx = settings.order.indexOf(key)
    if (idx <= 0) return
    const order = [...settings.order]
    ;[order[idx - 1], order[idx]] = [order[idx], order[idx - 1]]
    persist({ ...settings, order })
  }

  const moveDown = (key) => {
    const idx = settings.order.indexOf(key)
    if (idx < 0 || idx >= settings.order.length - 1) return
    const order = [...settings.order]
    ;[order[idx], order[idx + 1]] = [order[idx + 1], order[idx]]
    persist({ ...settings, order })
  }

  const reset = () => persist({ order: DEFAULT_ORDER, enabled: DEFAULT_ENABLED })

  const modules = settings.order
    .map(key => {
      const def = ALL_MODULES.find(m => m.key === key)
      return def ? { ...def, enabled: settings.enabled[key] ?? true } : null
    })
    .filter(Boolean)

  return (
    <ModulesContext.Provider value={{ modules, toggle, moveUp, moveDown, reset }}>
      {children}
    </ModulesContext.Provider>
  )
}

export function useModules() {
  return useContext(ModulesContext)
}
