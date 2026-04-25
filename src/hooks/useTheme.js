import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage'

export const THEMES = [
  {
    key: 'indigo',
    label: 'Indigo',
    emoji: '🔵',
    desc: 'Professional & minimal',
    colors: {
      // Light mode
      bgPage:      '#ffffff',
      bgCard:      '#f8fafc',
      bgInput:     '#f1f5f9',
      bgHover:     '#e2e8f0',
      textPrimary: '#1e293b',
      textSecondary: '#64748b',
      textMuted:   '#94a3b8',
      border:      '#e2e8f0',
      brand500:    '#6366f1',
      brand600:    '#4f46e5',
      // Dark mode
      darkBgPage:  '#0f172a',
      darkBgCard:  '#1e293b',
      darkBgInput: '#334155',
      darkBgHover: '#475569',
      darkTextPrimary: '#f1f5f9',
      darkTextSecondary: '#cbd5e1',
      darkTextMuted: '#94a3b8',
      darkBorder:  '#475569',
      darkBrand500: '#818cf8',
    },
  },
  {
    key: 'sunset',
    label: 'Sunset',
    emoji: '🌅',
    desc: 'Warm & vibrant',
    colors: {
      // Light mode
      bgPage:      '#faf8f6',
      bgCard:      '#fdf4f0',
      bgInput:     '#fde7e0',
      bgHover:     '#fdd5c9',
      textPrimary: '#5a2e26',
      textSecondary: '#a1632e',
      textMuted:   '#c9845f',
      border:      '#f4d4c3',
      brand500:    '#f04438',
      brand600:    '#d92d20',
      // Dark mode
      darkBgPage:  '#2a1810',
      darkBgCard:  '#3d251a',
      darkBgInput: '#522f24',
      darkBgHover: '#6b3d2f',
      darkTextPrimary: '#f5ddd2',
      darkTextSecondary: '#dab5a0',
      darkTextMuted: '#b8937f',
      darkBorder:  '#6b3d2f',
      darkBrand500: '#ff6b54',
    },
  },
  {
    key: 'forest',
    label: 'Forest',
    emoji: '🌲',
    desc: 'Calm & natural',
    colors: {
      // Light mode
      bgPage:      '#f4faf6',
      bgCard:      '#eef7f1',
      bgInput:     '#e0f0e7',
      bgHover:     '#cfe5d9',
      textPrimary: '#1b4d2a',
      textSecondary: '#3d7a52',
      textMuted:   '#6b9b7a',
      border:      '#c2dcc9',
      brand500:    '#22c55e',
      brand600:    '#16a34a',
      // Dark mode
      darkBgPage:  '#0a2818',
      darkBgCard:  '#153d2a',
      darkBgInput: '#1f5238',
      darkBgHover: '#2a6d47',
      darkTextPrimary: '#d4f1da',
      darkTextSecondary: '#a5d5b5',
      darkTextMuted: '#7eb697',
      darkBorder:  '#2a6d47',
      darkBrand500: '#4ade80',
    },
  },
  {
    key: 'ocean',
    label: 'Ocean',
    emoji: '🌊',
    desc: 'Cool & flowing',
    colors: {
      // Light mode
      bgPage:      '#f0f9ff',
      bgCard:      '#e8f4f8',
      bgInput:     '#d1e8f1',
      bgHover:     '#b5dde9',
      textPrimary: '#0c3d66',
      textSecondary: '#1e6b8e',
      textMuted:   '#4a92b3',
      border:      '#a8d9e8',
      brand500:    '#0ea5e9',
      brand600:    '#0284c7',
      // Dark mode
      darkBgPage:  '#0a1e2e',
      darkBgCard:  '#132e48',
      darkBgInput: '#1a3f56',
      darkBgHover: '#235470',
      darkTextPrimary: '#d5e9f5',
      darkTextSecondary: '#a0c8df',
      darkTextMuted: '#7aabcb',
      darkBorder:  '#235470',
      darkBrand500: '#38bdf8',
    },
  },
]

export function useTheme() {
  const [theme, setThemeState] = useState(() => load('theme') || 'indigo')

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
  if (!themeObj) {
    console.warn('Theme not found:', themeKey)
    return
  }

  const root = document.documentElement
  const c = themeObj.colors
  console.log('Applying theme:', themeKey, 'colors:', c)

  // Light mode CSS variables
  root.style.setProperty('--bg-page',  c.bgPage)
  root.style.setProperty('--bg-card',  c.bgCard)
  root.style.setProperty('--bg-input', c.bgInput)
  root.style.setProperty('--bg-hover', c.bgHover)
  root.style.setProperty('--text-primary',   c.textPrimary)
  root.style.setProperty('--text-secondary', c.textSecondary)
  root.style.setProperty('--text-muted',     c.textMuted)
  root.style.setProperty('--border-input',   c.border)
  root.style.setProperty('--border-card',    c.border)
  root.style.setProperty('--brand-500',      c.brand500)
  root.style.setProperty('--brand-600',      c.brand600)

  // Dark mode CSS variables (read by html.dark via var(--dark-bg-page, fallback))
  root.style.setProperty('--dark-bg-page',  c.darkBgPage)
  root.style.setProperty('--dark-bg-card',  c.darkBgCard)
  root.style.setProperty('--dark-bg-input', c.darkBgInput)
  root.style.setProperty('--dark-bg-hover', c.darkBgHover)
  root.style.setProperty('--dark-text-primary',   c.darkTextPrimary)
  root.style.setProperty('--dark-text-secondary', c.darkTextSecondary)
  root.style.setProperty('--dark-text-muted',     c.darkTextMuted)
  root.style.setProperty('--dark-border',         c.darkBorder)
  root.style.setProperty('--dark-brand-500',      c.darkBrand500)
}

// Initialize theme on app load (called in main.jsx before React hydration)
export function initTheme() {
  const theme = load('theme') || 'indigo'
  applyTheme(theme)
}
