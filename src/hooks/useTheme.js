import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage'

export const THEMES = [
  {
    key: 'slate',
    label: 'Slate',
    desc: 'Clean & professional',
    colors: {
      bgPage:      '#f4f7fb',
      bgCard:      '#ffffff',
      bgInput:     '#edf1f8',
      bgHover:     '#e4eaf4',
      textPrimary: '#1a2332',
      textSecondary: '#455469',
      textMuted:   '#5a6a80',
      border:      '#c5d0dd',
      brand50:     '#eff6ff',
      brand100:    '#dbeafe',
      brand400:    '#60a5fa',
      brand500:    '#2563eb',
      brand600:    '#1d4ed8',
    },
  },
  {
    key: 'amber',
    label: 'Amber',
    desc: 'Warm & inviting',
    colors: {
      bgPage:      '#fdf6e4',
      bgCard:      '#fffbf0',
      bgInput:     '#f8edd8',
      bgHover:     '#f2e0c0',
      textPrimary: '#1e1409',
      textSecondary: '#5c4422',
      textMuted:   '#7a5c32',
      border:      '#d4b87a',
      brand50:     '#fffbeb',
      brand100:    '#fef3c7',
      brand400:    '#fbbf24',
      brand500:    '#d97706',
      brand600:    '#b45309',
    },
  },
  {
    key: 'emerald',
    label: 'Emerald',
    desc: 'Natural & calm',
    colors: {
      bgPage:      '#ecf7f2',
      bgCard:      '#f5fdf9',
      bgInput:     '#daeee6',
      bgHover:     '#c5e4d4',
      textPrimary: '#0a1e16',
      textSecondary: '#2e5c45',
      textMuted:   '#3d7256',
      border:      '#a8ccba',
      brand50:     '#ecfdf5',
      brand100:    '#d1fae5',
      brand400:    '#34d399',
      brand500:    '#059669',
      brand600:    '#047857',
    },
  },
  {
    key: 'violet',
    label: 'Violet',
    desc: 'Creative & modern',
    colors: {
      bgPage:      '#f3eefa',
      bgCard:      '#f9f6fe',
      bgInput:     '#e8ddf5',
      bgHover:     '#d8ccec',
      textPrimary: '#180e2e',
      textSecondary: '#4a386a',
      textMuted:   '#7a6298',
      border:      '#c0aed8',
      brand50:     '#f5f3ff',
      brand100:    '#ede9fe',
      brand400:    '#a78bfa',
      brand500:    '#7c3aed',
      brand600:    '#6d28d9',
    },
  },
  {
    key: 'dark',
    label: 'Dark',
    desc: 'Black & grey',
    colors: {
      bgPage:      '#111111',
      bgCard:      '#1c1c1c',
      bgInput:     '#252525',
      bgHover:     '#2e2e2e',
      textPrimary: '#efefef',
      textSecondary: '#a0a0a0',
      textMuted:   '#6b6b6b',
      border:      '#383838',
      brand50:     '#1e2d40',
      brand100:    '#1e3a5f',
      brand400:    '#60a5fa',
      brand500:    '#3b82f6',
      brand600:    '#2563eb',
    },
  },
]

export function useTheme() {
  const [theme, setThemeState] = useState(() => load('theme') || 'slate')

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = (key) => {
    setThemeState(key)
    save('theme', key)
  }

  return { theme, setTheme, themes: THEMES }
}

function applyTheme(themeKey) {
  const themeObj = THEMES.find(t => t.key === themeKey)
  if (!themeObj) return

  const root = document.documentElement
  const c = themeObj.colors

  // Dark theme activates html.dark so Tailwind dark: utilities work
  if (themeKey === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  // Inline styles always override html.dark stylesheet rules
  root.style.setProperty('--bg-page',  c.bgPage)
  root.style.setProperty('--bg-card',  c.bgCard)
  root.style.setProperty('--bg-input', c.bgInput)
  root.style.setProperty('--bg-hover', c.bgHover)
  root.style.setProperty('--text-primary',   c.textPrimary)
  root.style.setProperty('--text-secondary', c.textSecondary)
  root.style.setProperty('--text-muted',     c.textMuted)
  root.style.setProperty('--border-input',   c.border)
  root.style.setProperty('--border-card',    c.border)
  root.style.setProperty('--brand-50',  c.brand50)
  root.style.setProperty('--brand-100', c.brand100)
  root.style.setProperty('--brand-400', c.brand400)
  root.style.setProperty('--brand-500', c.brand500)
  root.style.setProperty('--brand-600', c.brand600)
}

// Called in main.jsx before React hydration to prevent flash
export function initTheme() {
  const theme = load('theme') || 'slate'
  applyTheme(theme)
}
