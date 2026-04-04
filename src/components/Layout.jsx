import { NavLink, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/',          label: 'Dashboard', emoji: '🏠' },
  { to: '/habits',    label: 'Habits',    emoji: '✅' },
  { to: '/goals',     label: 'Goals',     emoji: '🎯' },
  { to: '/training',  label: 'Training',  emoji: '💪' },
  { to: '/education', label: 'Education', emoji: '📚' },
  { to: '/business',  label: 'Business',  emoji: '💼' },
]

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar — desktop only */}
      <header className="hidden sm:flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-30">
        <span className="text-xl font-bold text-brand-600 tracking-tight">Liam's Tracker</span>
        <nav className="flex gap-1 ml-6">
          {NAV.map(({ to, label, emoji }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
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
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-5 pb-24 sm:pb-8">
        {children}
      </main>

      {/* Bottom tab bar — mobile only */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex z-30 safe-area-pb">
        {NAV.map(({ to, label, emoji }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-600' : 'text-gray-400'
              }`
            }
          >
            <span className="text-lg leading-none">{emoji}</span>
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
