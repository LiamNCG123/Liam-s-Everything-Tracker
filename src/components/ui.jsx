// ─── Shared UI primitives ─────────────────────────────────────────────────────
//
// Dark mode uses CSS variable-backed tokens (index.css → tailwind.config.js dm-*).
//
// Elevation stack (dark):
//   dm-page #0d1117  →  dm-card #161b22  →  dm-input #1c2128  →  dm-hover #21262d
//
// Text contrast (all measured on #0d1117):
//   dm-primary   #e6edf3  14.9:1 AAA
//   dm-secondary #8b949e   6.1:1 AA
//   dm-muted     #6e7681   4.6:1 AA  (borderline — keep for large/bold text only)
//

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-dm-card rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-dm-subtle ${className}`}>
      {children}
    </div>
  )
}

// ─── PageHeader ───────────────────────────────────────────────────────────────

export function PageHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-dm-primary">{title}</h1>
      {action}
    </div>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────

export function Button({ children, onClick, variant = 'primary', size = 'md', className = '', type = 'button', disabled = false }) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    // brand-500 (#6366f1) with white text = 4.46:1 (borderline AA for small text).
    // For larger button text this is acceptable; we reinforce with ring on focus.
    primary:   'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 focus:ring-brand-500 dark:focus:ring-brand-400 focus:ring-offset-white dark:focus:ring-offset-dm-card',
    secondary: 'bg-gray-100 dark:bg-dm-input text-gray-700 dark:text-dm-primary hover:bg-gray-200 dark:hover:bg-dm-hover active:bg-gray-300 dark:active:bg-dm-active border border-transparent dark:border-dm-border focus:ring-gray-400 dark:focus:ring-dm-strong focus:ring-offset-white dark:focus:ring-offset-dm-card',
    danger:    'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 active:bg-red-200 dark:border dark:border-red-800/50 focus:ring-red-500 focus:ring-offset-white dark:focus:ring-offset-dm-card',
    ghost:     'text-gray-500 dark:text-dm-secondary hover:bg-gray-100 dark:hover:bg-dm-hover hover:text-gray-700 dark:hover:text-dm-primary active:bg-gray-200 dark:active:bg-dm-active focus:ring-gray-400 dark:focus:ring-dm-strong focus:ring-offset-white dark:focus:ring-offset-dm-card',
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
// /10 opacity tint backgrounds are more refined than /40 — less noise, more air.

export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-dm-secondary',
    green:  'bg-green-100 dark:bg-green-400/10 text-green-700 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-400',
    red:    'bg-red-100 dark:bg-red-400/10 text-red-600 dark:text-red-400',
    blue:   'bg-blue-100 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-400/10 text-purple-700 dark:text-purple-400',
    indigo: 'bg-brand-100 dark:bg-brand-400/10 text-brand-700 dark:text-brand-400',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
// Focus ring uses brand-400 in dark (#818cf8 on #1c2128 = 6.8:1 AA ✓).

export function Input({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-gray-700 dark:text-dm-secondary">{label}</span>}
      <input
        className="border border-gray-200 dark:border-dm-border rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-dm-primary bg-gray-50 dark:bg-dm-input placeholder-gray-400 dark:placeholder-dm-muted focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:focus:ring-brand-400/25 focus:border-brand-500 dark:focus:border-brand-400 focus:bg-white dark:focus:bg-dm-input transition"
        {...props}
      />
    </label>
  )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

export function Textarea({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-gray-700 dark:text-dm-secondary">{label}</span>}
      <textarea
        rows={3}
        className="border border-gray-200 dark:border-dm-border rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-dm-primary bg-gray-50 dark:bg-dm-input placeholder-gray-400 dark:placeholder-dm-muted focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:focus:ring-brand-400/25 focus:border-brand-500 dark:focus:border-brand-400 focus:bg-white dark:focus:bg-dm-input transition resize-none"
        {...props}
      />
    </label>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────

export function Select({ label, children, ...props }) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-gray-700 dark:text-dm-secondary">{label}</span>}
      <select
        className="border border-gray-200 dark:border-dm-border rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-dm-primary bg-gray-50 dark:bg-dm-input focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:focus:ring-brand-400/25 focus:border-brand-500 dark:focus:border-brand-400 focus:bg-white dark:focus:bg-dm-input transition"
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
// Backdrop is darker in dark mode (black/65) — the dark page needs a stronger
// scrim to separate it from the modal sheet.

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-dm-card rounded-t-3xl sm:rounded-2xl shadow-xl dark:shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-dm-subtle">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-dm-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-dm-muted hover:text-gray-600 dark:hover:text-dm-secondary transition text-2xl leading-none font-light w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-dm-hover"
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
      <h3 className="text-lg font-semibold text-gray-700 dark:text-dm-secondary mb-1">{title}</h3>
      <p className="text-sm text-gray-400 dark:text-dm-muted mb-5 max-w-xs">{description}</p>
      {action}
    </div>
  )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
// Track uses dm-input in dark (#1c2128) — clearly distinct from dm-card (#161b22).
// Filled bar uses -400 variants in dark mode for better visibility.

export function ProgressBar({ value, max = 100, color = 'indigo' }) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0))
  const colors = {
    indigo: 'bg-brand-500 dark:bg-brand-400',
    green:  'bg-green-500 dark:bg-green-400',
    yellow: 'bg-yellow-400 dark:bg-yellow-400',
    red:    'bg-red-400 dark:bg-red-400',
  }
  return (
    <div className="w-full bg-gray-100 dark:bg-dm-input rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colors[color] ?? colors.indigo}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
// Stays dark-on-dark in dark mode — uses dm-active background with primary text
// so it doesn't flash white against an already-dark page.

export function Toast({ message, visible }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="bg-gray-900/90 dark:bg-dm-active text-white dark:text-dm-primary text-sm font-medium px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap backdrop-blur-sm border border-transparent dark:border-dm-border">
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
        <div className="text-3xl font-bold text-gray-900 dark:text-dm-primary leading-tight tabular-nums">{value}</div>
        <div className="text-[11px] font-semibold text-gray-400 dark:text-dm-muted uppercase tracking-wide mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 dark:text-dm-muted mt-0.5">{sub}</div>}
      </div>
    </Card>
  )
}
