// Shared UI primitives used across all modules

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  )
}

export function PageHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {action}
    </div>
  )
}

export function Button({ children, onClick, variant = 'primary', size = 'md', className = '', type = 'button', disabled = false }) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200',
    ghost: 'text-gray-500 hover:bg-gray-100 active:bg-gray-200',
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
    gray:   'bg-gray-100 text-gray-600',
    green:  'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red:    'bg-red-100 text-red-600',
    blue:   'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    indigo: 'bg-brand-100 text-brand-700',
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
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      <input
        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-gray-50 focus:bg-white transition"
        {...props}
      />
    </label>
  )
}

export function Textarea({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      <textarea
        rows={3}
        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-gray-50 focus:bg-white transition resize-none"
        {...props}
      />
    </label>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      <select
        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-gray-50 focus:bg-white transition"
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
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-2xl leading-none font-light"
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
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 mb-5 max-w-xs">{description}</p>
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
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
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
      <div className="bg-gray-900/90 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap backdrop-blur-sm">
        {message}
      </div>
    </div>
  )
}

// Subtle "all done" completion state — animate in, tasteful green
export function CompletionBanner({ title, sub, className = '' }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-100 rounded-2xl animate-fade-in-up ${className}`}>
      <span className="text-green-500 text-base leading-none shrink-0">✓</span>
      <div>
        <div className="text-sm font-semibold text-green-800 leading-snug">{title}</div>
        {sub && <div className="text-xs text-green-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export function StatCard({ label, value, sub, icon }) {
  return (
    <Card className="p-4 flex items-start gap-3">
      {icon && <span className="text-2xl mt-0.5">{icon}</span>}
      <div className="min-w-0">
        <div className="text-2xl font-bold text-gray-900 leading-tight">{value}</div>
        <div className="text-sm font-medium text-gray-600">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </Card>
  )
}
