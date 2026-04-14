import { NavLink } from 'react-router-dom'
import QuickAdd from './QuickAdd'
import { useDarkMode } from '../hooks/useDarkMode'

// Each route carries its own accent color for the active pill
const NAV = [
  { to: '/',          label: 'Today',     emoji: '☀️',  pill: 'bg-indigo-100 dark:bg-indigo-900', text: 'text-indigo-600 dark:text-indigo-300'  },
  { to: '/habits',    label: 'Habits',    emoji: '✅',  pill: 'bg-violet-100 dark:bg-violet-900', text: 'text-violet-600 dark:text-violet-300'  },
  { to: '/training',  label: 'Training',  emoji: '💪',  pill: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-600 dark:text-orange-300'  },
  { to: '/finance',   label: 'Finance',   emoji: '💰',  pill: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-600 dark:text-emerald-300' },
  { to: '/goals',     label: 'Goals',     emoji: '🎯',  pill: 'bg-blue-100 dark:bg-blue-900',   text: 'text-blue-600 dark:text-blue-300'    },
  { to: '/education', label: 'Education', emoji: '📚',  pill: 'bg-amber-100 dark:bg-amber-900',  text: 'text-amber-600 dark:text-amber-300'   },
  { to: '/review',    label: 'Review',    emoji: '📋',  pill: 'bg-sky-100 dark:bg-sky-900',     text: 'text-sky-600 dark:text-sky-300'      },
]

function DarkToggle({ dark, setDark }) {
  return (
    <button
      onClick={() => setDark(d => !d)}
      className="ml-auto text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

export default function Layout({ children }) {
  const [dark, setDark] = useDarkMode()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

      {/* Top bar — desktop only */}
      <header className="hidden sm:flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30">
        <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Spora</span>
        <nav className="flex gap-0.5 ml-6">
          {NAV.map(({ to, label, emoji, pill, text }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? `${pill} ${text}` : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
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
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex z-30 safe-area-pb">
        {NAV.map(({ to, label, emoji, pill, text }) => (
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
                <span className={`text-[10px] font-semibold tracking-wide transition-colors ${isActive ? text : 'text-gray-400 dark:text-gray-500'}`}>
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
