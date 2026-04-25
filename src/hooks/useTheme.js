import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage'

export const THEMES = [
  {
    key: 'slate',
    label: 'Slate',
    desc: 'Clean & professional',
    colors: {
      // Light mode
      bgPage:      '#fafbfc',
      bgCard:      '#ffffff',
      bgInput:     '#f6f8fa',
      bgHover:     '#eaeef2',
      textPrimary: '#24292f',
      textSecondary: '#57606a',
      textMuted:   '#848d97',
      border:      '#d0d7de',
      brand500:    '#0969da',
      brand600:    '#033d8b',
      // Dark mode
      darkBgPage:  '#0d1117',
      darkBgCard:  '#161b22',
      darkBgInput: '#0d1117',
      darkBgHover: '#21262d',
      darkTextPrimary: '#e6edf3',
      darkTextSecondary: '#8b949e',
      darkTextMuted: '#6e7681',
      darkBorder:  '#30363d',
      darkBrand500: '#58a6ff',
    },
  },
  {
    key: 'amber',
    label: 'Amber',
    desc: 'Warm & inviting',
    colors: {
      // Light mode
      bgPage:      '#fefdfb',
      bgCard:      '#fffbf5',
      bgInput:     '#fef3c7',
      bgHover:     '#fde68a',
      textPrimary: '#78350f',
      textSecondary: '#92400e',
      textMuted:   '#b45309',
      border:      '#fcd34d',
      brand500:    '#d97706',
      brand600:    '#b45309',
      // Dark mode
      darkBgPage:  '#1f1208',
      darkBgCard:  '#2d1810',
      darkBgInput: '#3d2415',
      darkBgHover: '#54330c',
      darkTextPrimary: '#fef3c7',
      darkTextSecondary: '#fcd34d',
      darkTextMuted: '#f59e0b',
      darkBorder:  '#92400e',
      darkBrand500: '#fbbf24',
    },
  },
  {
    key: 'emerald',
    label: 'Emerald',
    desc: 'Natural & calm',
    colors: {
      // Light mode
      bgPage:      '#f0fdf4',
      bgCard:      '#f7fefc',
      bgInput:     '#dcfce7',
      bgHover:     '#bbf7d0',
      textPrimary: '#15803d',
      textSecondary: '#16a34a',
      textMuted:   '#4b5563',
      border:      '#86efac',
      brand500:    '#059669',
      brand600:    '#047857',
      // Dark mode
      darkBgPage:  '#0a2e1c',
      darkBgCard:  '#132818',
      darkBgInput: '#1b3a26',
      darkBgHover: '#235138',
      darkTextPrimary: '#d1fae5',
      darkTextSecondary: '#a7f3d0',
      darkTextMuted: '#6ee7b7',
      darkBorder:  '#10b981',
      darkBrand500: '#6ee7b7',
    },
  },
  {
    key: 'violet',
    label: 'Violet',
    desc: 'Creative & modern',
    colors: {
      // Light mode
      bgPage:      '#faf5ff',
      bgCard:      '#fef5ff',
      bgInput:     '#f3e8ff',
      bgHover:     '#e9d5ff',
      textPrimary: '#5b21b6',
      textSecondary: '#7c3aed',
      textMuted:   '#a78bfa',
      border:      '#d8b4fe',
      brand500:    '#7c3aed',
      brand600:    '#6d28d9',
      // Dark mode
      darkBgPage:  '#1e1b4b',
      darkBgCard:  '#2e1a47',
      darkBgInput: '#3f2463',
      darkBgHover: '#553399',
      darkTextPrimary: '#e9d5ff',
      darkTextSecondary: '#d8b4fe',
      darkTextMuted: '#c084fc',
      darkBorder:  '#a78bfa',
      darkBrand500: '#c4b5fd',
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
  const theme = load('theme') || 'slate'
  applyTheme(theme)
}
