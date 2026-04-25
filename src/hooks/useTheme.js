import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage'

// Each theme uses neutral surfaces with a single brand accent color.
// This keeps the UI clean and modern while the brand color carries
// the theme personality (buttons, links, focus rings, toggles).
export const THEMES = [
  {
    key: 'slate',
    label: 'Slate',
    desc: 'Clean & professional',
    colors: {
      // Light mode — neutral grays
      bgPage:      '#fafbfc',
      bgCard:      '#ffffff',
      bgInput:     '#f6f8fa',
      bgHover:     '#f0f3f6',
      textPrimary: '#1f2328',
      textSecondary: '#656d76',
      textMuted:   '#8c959f',
      border:      '#d0d7de',
      brand500:    '#0969da',
      brand600:    '#0550ae',
      // Dark mode
      darkBgPage:  '#0d1117',
      darkBgCard:  '#161b22',
      darkBgInput: '#21262d',
      darkBgHover: '#262c36',
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
      // Light mode — neutral surfaces with amber accent
      bgPage:      '#fcfbf8',
      bgCard:      '#ffffff',
      bgInput:     '#f8f6f1',
      bgHover:     '#f3eee5',
      textPrimary: '#1f2328',
      textSecondary: '#656d76',
      textMuted:   '#8c959f',
      border:      '#e5e0d4',
      brand500:    '#d97706',
      brand600:    '#b45309',
      // Dark mode
      darkBgPage:  '#16130d',
      darkBgCard:  '#1f1b14',
      darkBgInput: '#28231a',
      darkBgHover: '#2e2820',
      darkTextPrimary: '#f5f1e8',
      darkTextSecondary: '#a8a092',
      darkTextMuted: '#7d756a',
      darkBorder:  '#3a3328',
      darkBrand500: '#fbbf24',
    },
  },
  {
    key: 'emerald',
    label: 'Emerald',
    desc: 'Natural & calm',
    colors: {
      // Light mode — neutral surfaces with emerald accent
      bgPage:      '#fafcfb',
      bgCard:      '#ffffff',
      bgInput:     '#f4f8f6',
      bgHover:     '#eaf3ee',
      textPrimary: '#1f2328',
      textSecondary: '#656d76',
      textMuted:   '#8c959f',
      border:      '#dde6e0',
      brand500:    '#059669',
      brand600:    '#047857',
      // Dark mode
      darkBgPage:  '#0d1411',
      darkBgCard:  '#141c18',
      darkBgInput: '#1a2520',
      darkBgHover: '#1f2c26',
      darkTextPrimary: '#e6f0eb',
      darkTextSecondary: '#8b9c93',
      darkTextMuted: '#6e7d75',
      darkBorder:  '#2a3a31',
      darkBrand500: '#34d399',
    },
  },
  {
    key: 'violet',
    label: 'Violet',
    desc: 'Creative & modern',
    colors: {
      // Light mode — neutral surfaces with violet accent
      bgPage:      '#fbfafc',
      bgCard:      '#ffffff',
      bgInput:     '#f6f4f9',
      bgHover:     '#eee9f4',
      textPrimary: '#1f2328',
      textSecondary: '#656d76',
      textMuted:   '#8c959f',
      border:      '#e1dce8',
      brand500:    '#7c3aed',
      brand600:    '#6d28d9',
      // Dark mode
      darkBgPage:  '#100d18',
      darkBgCard:  '#1a1622',
      darkBgInput: '#221d2c',
      darkBgHover: '#2a2338',
      darkTextPrimary: '#ebe6f2',
      darkTextSecondary: '#9690a0',
      darkTextMuted: '#726d7d',
      darkBorder:  '#332d40',
      darkBrand500: '#a78bfa',
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
