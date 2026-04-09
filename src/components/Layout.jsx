import { NavLink } from 'react-router-dom'
import QuickAdd from './QuickAdd'

// Each route carries its own accent color for the active pill
const NAV = [
  { to: '/',          label: 'Today',     emoji: '☀️',  pill: 'bg-indigo-100', text: 'text-indigo-600'  },
  { to: '/habits',    label: 'Habits',    emoji: '✅',  pill: 'bg-violet-100', text: 'text-violet-600'  },
  { to: '/training',  label: 'Training',  emoji: '💪',  pill: 'bg-orange-100', text: 'text-orange-600'  },
  { to: '/finance',   label: 'Finance',   emoji: '💰',  pill: 'bg-emerald-100',text: 'text-emerald-600' },
  { to: '/goals',     label: 'Goals',     emoji: '🎯',  pill: 'bg-blue-100',   text: 'text-blue-600'    },
  { to: '/education', label: 'Education', emoji: '📚',  pill: 'bg-amber-100',  text: 'text-amber-600'   },
  { to: '/review',    label: 'Review',    emoji: '📋',  pill: 'bg-sky-100',    text: 'text-sky-600'     },
]

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top bar — desktop only */}
      <header className="hidden sm:flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-100 sticky top-0 z-30">
        <span className="text-lg font-bold text-gray-900 tracking-tight">Liam's Tracker</span>
        <nav className="flex gap-0.5 ml-6">
          {NAV.map(({ to, label, emoji, pill, text }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? `${pill} ${text}` : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`
              }
            >
              <span>{emoji}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 pb-28 sm:pb-10">
        {children}
      </main>

      <QuickAdd />

      {/* Bottom tab bar — mobile only */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex z-30 safe-area-pb">
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
                <span className={`text-[10px] font-semibold tracking-wide transition-colors ${isActive ? text : 'text-gray-400'}`}>
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
