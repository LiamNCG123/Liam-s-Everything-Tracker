// ─── Shared UI primitives ─────────────────────────────────────────────────────
// All color classes use theme-aware utilities (bg-theme-*, text-theme-*, etc.)
// defined in index.css. These read CSS variables set by useTheme() so every
// component responds to theme and dark-mode changes automatically.

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-theme-card rounded-2xl shadow-sm border border-theme-subtle ${className}`}>
      {children}
    </div>
  )
}

// ─── PageHeader ───────────────────────────────────────────────────────────────

export function PageHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <h1 className="text-3xl font-bold tracking-tight text-theme-primary">{title}</h1>
      {action}
    </div>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────

export function Button({ children, onClick, variant = 'primary', size = 'md', className = '', type = 'button', disabled = false }) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary:   'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 focus:ring-brand-500',
    secondary: 'bg-theme-input text-theme-primary hover:bg-theme-hover border border-theme focus:ring-brand-500',
    danger:    'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 active:bg-red-200 dark:border dark:border-red-800/50 focus:ring-red-500',
    ghost:     'text-theme-secondary hover:bg-theme-hover hover:text-theme-primary focus:ring-brand-500',
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

// ─── Badge ────────────────────────────────────────────────────────────────────

export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-theme-input text-theme-secondary',
    green:  'bg-green-100 dark:bg-green-400/10 text-green-700 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-400',
    red:    'bg-red-100 dark:bg-red-400/10 text-red-600 dark:text-red-400',
    blue:   'bg-blue-100 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-400/10 text-purple-700 dark:text-purple-400',
    indigo: 'bg-brand-100 dark:bg-brand-400/10 text-brand-600',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────

export function Input({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-theme-secondary">{label}</span>}
      <input
        className="border border-theme rounded-xl px-3 py-2 text-sm text-theme-primary bg-theme-input placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 transition"
        {...props}
      />
    </label>
  )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

export function Textarea({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-theme-secondary">{label}</span>}
      <textarea
        rows={3}
        className="border border-theme rounded-xl px-3 py-2 text-sm text-theme-primary bg-theme-input placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 transition resize-none"
        {...props}
      />
    </label>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────

export function Select({ label, children, ...props }) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-theme-secondary">{label}</span>}
      <select
        className="border border-theme rounded-xl px-3 py-2 text-sm text-theme-primary bg-theme-input focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 transition"
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-theme-card rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-theme-subtle">
          <h2 className="text-lg font-semibold text-theme-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-secondary transition text-2xl leading-none font-light w-8 h-8 flex items-center justify-center rounded-lg hover:bg-theme-hover"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-theme-secondary mb-1">{title}</h3>
      <p className="text-sm text-theme-muted mb-5 max-w-xs">{description}</p>
      {action}
    </div>
  )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

export function ProgressBar({ value, max = 100, color = 'indigo' }) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0))
  const colors = {
    indigo: 'bg-brand-500',
    green:  'bg-green-500 dark:bg-green-400',
    amber:  'bg-amber-500 dark:bg-amber-400',
    yellow: 'bg-yellow-400',
    red:    'bg-red-400',
  }
  return (
    <div className="w-full bg-theme-input rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colors[color] ?? colors.indigo}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export function Toast({ message, visible }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="bg-gray-900/90 bg-gray-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap backdrop-blur-sm border border-transparent border-theme">
        {message}
      </div>
    </div>
  )
}

// ─── CompletionBanner ─────────────────────────────────────────────────────────

export function CompletionBanner({ title, sub, className = '' }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-400/10 border border-green-100 dark:border-green-400/20 rounded-2xl animate-fade-in-up ${className}`}>
      <span className="text-green-500 dark:text-green-400 text-base leading-none shrink-0">✓</span>
      <div>
        <div className="text-sm font-semibold text-green-800 dark:text-green-300 leading-snug">{title}</div>
        {sub && <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

export function StatCard({ label, value, sub, icon }) {
  return (
    <Card className="p-4 flex items-start gap-3">
      {icon && <span className="text-2xl mt-0.5">{icon}</span>}
      <div className="min-w-0">
        <div className="text-3xl font-bold text-theme-primary leading-tight tabular-nums">{value}</div>
        <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wide mt-0.5">{label}</div>
        {sub && <div className="text-xs text-theme-muted mt-0.5">{sub}</div>}
      </div>
    </Card>
  )
}
