import { NavLink } from 'react-router-dom'
import QuickAdd from './QuickAdd'
import { useDarkMode } from '../hooks/useDarkMode'
import { useModules } from '../hooks/useModules'

// ── Active pill colors ────────────────────────────────────────────────────────
const NAV_STATIC = [
  { to: '/',          label: 'Today',     emoji: '☀️',  pill: 'bg-brand-100 dark:bg-brand-500/20', text: 'text-brand-600 dark:text-brand-400'  },
]
const NAV_MODULE_STYLES = {
  habits:    { pill: 'bg-violet-100 dark:bg-violet-400/15',  text: 'text-violet-600 dark:text-violet-300'   },
  training:  { pill: 'bg-orange-100 dark:bg-orange-400/15',  text: 'text-orange-600 dark:text-orange-300'   },
  finance:   { pill: 'bg-emerald-100 dark:bg-emerald-400/15', text: 'text-emerald-600 dark:text-emerald-300' },
  goals:     { pill: 'bg-blue-100 dark:bg-blue-400/15',      text: 'text-blue-600 dark:text-blue-300'       },
  education: { pill: 'bg-amber-100 dark:bg-amber-400/15',    text: 'text-amber-600 dark:text-amber-300'     },
}
const NAV_TAIL = [
  { to: '/review',   label: 'Review',   emoji: '📋', pill: 'bg-sky-100 dark:bg-sky-400/15',  text: 'text-sky-600 dark:text-sky-300'    },
  { to: '/settings', label: 'Settings', emoji: '⚙️',  pill: 'bg-gray-100 dark:bg-gray-400/15', text: 'text-gray-600 dark:text-gray-300' },
]

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

function DarkToggle({ dark, setDark }) {
  return (
    <button
      onClick={() => setDark(d => !d)}
      className="ml-auto text-theme-muted hover:text-theme-secondary p-1.5 rounded-lg hover:bg-theme-hover transition-colors"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
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
    <div className="min-h-screen bg-theme-page flex flex-col">

      {/* Top bar — desktop only */}
      <header className="hidden sm:flex items-center gap-3 px-6 py-3 bg-theme-card border-b border-theme-subtle sticky top-0 z-30 backdrop-blur-sm">
        <span className="text-lg font-bold text-theme-primary tracking-tight">Spora</span>
        <nav className="flex gap-0.5 ml-6">
          {nav.map(({ to, label, pill, text }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? `${pill} ${text}`
                    : 'text-theme-secondary hover:bg-theme-hover hover:text-theme-primary'
                }`
              }
            >
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
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-theme-card border-t border-theme-subtle flex z-30 safe-area-pb">
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
                <span className={`text-[10px] font-semibold tracking-wide transition-colors ${isActive ? text : 'text-theme-muted'}`}>
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
