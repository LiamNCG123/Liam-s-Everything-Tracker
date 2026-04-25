import { NavLink } from 'react-router-dom'
import QuickAdd from './QuickAdd'
import { useDarkMode } from '../hooks/useDarkMode'
import { useModules } from '../hooks/useModules'

// ── Active pill colors ────────────────────────────────────────────────────────
const NAV_STATIC = [
  { to: '/',          label: 'Today',     emoji: '☀️',  pill: 'bg-indigo-100 dark:bg-indigo-400/15', text: 'text-indigo-600 dark:text-indigo-300'  },
]
const NAV_MODULE_STYLES = {
  habits:    { pill: 'bg-violet-100 dark:bg-violet-400/15',  text: 'text-violet-600 dark:text-violet-300'   },
  training:  { pill: 'bg-orange-100 dark:bg-orange-400/15',  text: 'text-orange-600 dark:text-orange-300'   },
  finance:   { pill: 'bg-emerald-100 dark:bg-emerald-400/15', text: 'text-emerald-600 dark:text-emerald-300' },
  goals:     { pill: 'bg-blue-100 dark:bg-blue-400/15',      text: 'text-blue-600 dark:text-blue-300'       },
  education: { pill: 'bg-amber-100 dark:bg-amber-400/15',    text: 'text-amber-600 dark:text-amber-300'     },
  business:  { pill: 'bg-purple-100 dark:bg-purple-400/15',  text: 'text-purple-600 dark:text-purple-300'   },
}
const NAV_TAIL = [
  { to: '/review',   label: 'Review',   emoji: '📋', pill: 'bg-sky-100 dark:bg-sky-400/15',  text: 'text-sky-600 dark:text-sky-300'    },
  { to: '/settings', label: 'Settings', emoji: '⚙️',  pill: 'bg-gray-100 dark:bg-gray-400/15', text: 'text-gray-600 dark:text-gray-300' },
]

function DarkToggle({ dark, setDark }) {
  return (
    <button
      onClick={() => setDark(d => !d)}
      className="ml-auto text-gray-400 dark:text-dm-muted hover:text-gray-600 dark:hover:text-dm-secondary p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dm-hover transition-colors"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

export default function Layout({ children }) {
  const [dark, setDark] = useDarkMode()
  const { modules } = useModules()

  const nav = [
    ...NAV_STATIC,
    ...modules
      .filter(m => m.enabled)
      .map(m => ({ to: m.path, label: m.label, emoji: m.emoji, ...NAV_MODULE_STYLES[m.key] })),
    ...NAV_TAIL,
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dm-page flex flex-col">

      {/* Top bar — desktop only */}
      <header className="hidden sm:flex items-center gap-3 px-6 py-3 bg-white dark:bg-dm-card border-b border-gray-100 dark:border-dm-subtle sticky top-0 z-30 backdrop-blur-sm">
        <span className="text-lg font-bold text-gray-900 dark:text-dm-primary tracking-tight">Spora</span>
        <nav className="flex gap-0.5 ml-6">
          {nav.map(({ to, label, emoji, pill, text }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? `${pill} ${text}`
                    : 'text-gray-500 dark:text-dm-secondary hover:bg-gray-100 dark:hover:bg-dm-hover hover:text-gray-700 dark:hover:text-dm-primary'
                }`
              }
            >
              <span>{emoji}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <DarkToggle dark={dark} setDark={setDark} />
      </header>

      {/* Page content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 pb-28 sm:pb-10">
        {children}
      </main>

      <QuickAdd />

      {/* Bottom tab bar — mobile only */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-dm-card border-t border-gray-100 dark:border-dm-subtle flex z-30 safe-area-pb">
        {nav.map(({ to, label, emoji, pill, text }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex-1 flex flex-col items-center pt-2 pb-1 gap-0.5"
          >
            {({ isActive }) => (
              <>
                <span className={`text-lg leading-none px-2.5 py-1 rounded-2xl transition-colors ${isActive ? pill : ''}`}>
                  {emoji}
                </span>
                <span className={`text-[10px] font-semibold tracking-wide transition-colors ${isActive ? text : 'text-gray-400 dark:text-dm-muted'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

    </div>
  )
}
