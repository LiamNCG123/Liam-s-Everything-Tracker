// Shared UI primitives used across all modules

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 ${className}`}>
      {children}
    </div>
  )
}

export function PageHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h1>
      {action}
    </div>
  )
}

export function Button({ children, onClick, variant = 'primary', size = 'md', className = '', type = 'button', disabled = false }) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
    secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600',
    danger: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 active:bg-red-200',
    ghost: 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    green:  'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
    red:    'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    blue:   'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    indigo: 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  )
}

export function Input({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
      <input
        className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 transition"
        {...props}
      />
    </label>
  )
}

export function Textarea({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
      <textarea
        rows={3}
        className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 transition resize-none"
        {...props}
      />
    </label>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
      <select
        className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition"
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition text-2xl leading-none font-light"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-5 max-w-xs">{description}</p>
      {action}
    </div>
  )
}

export function ProgressBar({ value, max = 100, color = 'indigo' }) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0))
  const colors = {
    indigo: 'bg-brand-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
    red: 'bg-red-400',
  }
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colors[color] ?? colors.indigo}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// Floating pill notification — fades in/out, fixed position, auto-dismissed by caller
export function Toast({ message, visible }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="bg-gray-900/90 dark:bg-gray-100/90 text-white dark:text-gray-900 text-sm font-medium px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap backdrop-blur-sm">
        {message}
      </div>
    </div>
  )
}

// Subtle "all done" completion state — animate in, tasteful green
export function CompletionBanner({ title, sub, className = '' }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-2xl animate-fade-in-up ${className}`}>
      <span className="text-green-500 text-base leading-none shrink-0">✓</span>
      <div>
        <div className="text-sm font-semibold text-green-800 dark:text-green-300 leading-snug">{title}</div>
        {sub && <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export function StatCard({ label, value, sub, icon }) {
  return (
    <Card className="p-4 flex items-start gap-3">
      {icon && <span className="text-2xl mt-0.5">{icon}</span>}
      <div className="min-w-0">
        <div className="text-3xl font-bold text-gray-900 dark:text-white leading-tight tabular-nums">{value}</div>
        <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>}
      </div>
    </Card>
  )
}
