import { useState } from 'react'
import { useModules } from '../hooks/useModules'
import { useTheme, THEMES } from '../hooks/useTheme'
import { load, save } from '../utils/storage'
import { Card } from '../components/ui'

export default function Settings() {
  const { modules, toggle, moveUp, moveDown, reset } = useModules()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState(() => load('userName') || '')
  const [savedFlash, setSavedFlash] = useState(false)

  const saveName = () => {
    save('userName', name.trim())
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight text-theme-primary">Settings</h1>

      {/* Profile */}
      <Card className="p-5">
        <h2 className="font-semibold text-theme-primary mb-4">Profile</h2>
        <label className="block text-sm text-theme-secondary mb-2">Your name</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            placeholder="Enter your name"
            className="flex-1 border border-theme bg-theme-input rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-theme-muted outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
          />
          <button
            onClick={saveName}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors min-w-[72px]"
          >
            {savedFlash ? '✓' : 'Save'}
          </button>
        </div>
      </Card>

      {/* Theme */}
      <Card className="p-5">
        <h2 className="font-semibold text-theme-primary mb-4">Color Scheme</h2>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map(t => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                theme === t.key
                  ? 'border-brand-500 bg-brand-500/5'
                  : 'border-theme hover:border-theme-secondary'
              }`}
            >
              {theme === t.key && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-brand-500 rounded-full" />
              )}
              <div className="font-medium text-theme-primary text-sm">{t.label}</div>
              <p className="text-xs text-theme-muted mt-1">{t.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Modules */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-theme-primary">Modules</h2>
          <button
            onClick={reset}
            className="text-xs text-theme-muted hover:text-brand-500 transition-colors"
          >
            Reset
          </button>
        </div>
        <p className="text-xs text-theme-muted mb-4">
          Enable modules and reorder them with arrows.
        </p>

        <div className="flex flex-col gap-2">
          {modules.map((mod, idx) => (
            <div
              key={mod.key}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                mod.enabled
                  ? 'border-theme-subtle bg-theme-hover'
                  : 'border-theme-subtle bg-theme-card opacity-50'
              }`}
            >
              {/* Up / down reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveUp(mod.key)}
                  disabled={idx === 0}
                  aria-label={`Move ${mod.label} up`}
                  className="text-theme-muted hover:text-theme-primary disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none px-1"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveDown(mod.key)}
                  disabled={idx === modules.length - 1}
                  aria-label={`Move ${mod.label} down`}
                  className="text-theme-muted hover:text-theme-primary disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none px-1"
                >
                  ▼
                </button>
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium text-theme-primary">
                  {mod.label}
                </p>
              </div>

              {/* Toggle switch */}
              <button
                role="switch"
                aria-checked={mod.enabled}
                onClick={() => toggle(mod.key)}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                  mod.enabled ? 'bg-brand-500' : 'bg-theme-input'
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
