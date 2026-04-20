// Simple localStorage wrapper with namespaced keys
const PREFIX = 'let_'

export function load(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.error('Storage write failed:', e)
  }
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key)
}

// Generate a simple unique ID
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// Convert a Date object to YYYY-MM-DD in local time (never use toISOString — that's UTC)
export function dateToStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Today as YYYY-MM-DD string in local time
export function today() {
  return dateToStr(new Date())
}

// Format a date string for display
export function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Days between two YYYY-MM-DD strings
export function daysBetween(a, b) {
  const msPerDay = 86400000
  return Math.round((new Date(b) - new Date(a)) / msPerDay)
}
