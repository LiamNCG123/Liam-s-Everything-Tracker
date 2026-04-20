import { useState } from 'react'
import { useModules } from '../hooks/useModules'
import { load, save } from '../utils/storage'
import { Card } from '../components/ui'

export default function Settings() {
  const { modules, toggle, moveUp, moveDown, reset } = useModules()
  const [name, setName] = useState(() => load('userName') || '')
  const [savedFlash, setSavedFlash] = useState(false)

  const saveName = () => {
    save('userName', name.trim())
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-dm-primary">Settings</h1>

      {/* Profile */}
      <Card className="p-4">
        <h2 className="font-semibold text-gray-900 dark:text-dm-primary mb-3">Profile</h2>
        <label className="block text-sm text-gray-500 dark:text-dm-secondary mb-1.5">Your name</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            placeholder="Enter your name"
            className="flex-1 border border-gray-200 dark:border-dm-border bg-white dark:bg-dm-input rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-dm-primary placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
          <button
            onClick={saveName}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium rounded-xl transition-colors min-w-[72px]"
          >
            {savedFlash ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </Card>

      {/* Modules */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-900 dark:text-dm-primary">Modules</h2>
          <button
            onClick={reset}
            className="text-xs text-gray-400 dark:text-dm-muted hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Reset to defaults
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-dm-muted mb-4">
          Toggle modules on or off, and reorder your dashboard with the arrows.
        </p>

        <div className="flex flex-col gap-2">
          {modules.map((mod, idx) => (
            <div
              key={mod.key}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                mod.enabled
                  ? 'border-gray-100 dark:border-dm-border bg-gray-50 dark:bg-dm-hover'
                  : 'border-gray-100 dark:border-dm-border bg-white dark:bg-dm-card opacity-40'
              }`}
            >
              {/* Up / down reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveUp(mod.key)}
                  disabled={idx === 0}
                  aria-label={`Move ${mod.label} up`}
                  className="text-gray-300 dark:text-dm-muted hover:text-gray-600 dark:hover:text-dm-primary disabled:opacity-20 disabled:cursor-not-allowed text-[10px] leading-none"
                >▲</button>
                <button
                  onClick={() => moveDown(mod.key)}
                  disabled={idx === modules.length - 1}
                  aria-label={`Move ${mod.label} down`}
                  className="text-gray-300 dark:text-dm-muted hover:text-gray-600 dark:hover:text-dm-primary disabled:opacity-20 disabled:cursor-not-allowed text-[10px] leading-none"
                >▼</button>
              </div>

              <span className="text-xl shrink-0">{mod.emoji}</span>

              <p className="flex-1 text-sm font-medium text-gray-800 dark:text-dm-primary">
                {mod.label}
              </p>

              {/* Toggle switch */}
              <button
                role="switch"
                aria-checked={mod.enabled}
                onClick={() => toggle(mod.key)}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                  mod.enabled ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-dm-border'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    mod.enabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
