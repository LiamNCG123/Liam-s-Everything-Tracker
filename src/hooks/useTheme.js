import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage'

// Each theme uses neutral surfaces with a single brand accent color.
// In dark mode, surfaces have a subtle tint matching the theme's brand,
// while text remains high-contrast (WCAG AA+) for readability.
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
      // Dark mode — neutral charcoal
      darkBgPage:  '#0d1117',
      darkBgCard:  '#161b22',
      darkBgInput: '#1c2128',
      darkBgHover: '#262c36',
      darkTextPrimary:   '#e6edf3', // 14.9:1 on bg-page (AAA)
      darkTextSecondary: '#b1bac4', //  9.4:1 (AAA)
      darkTextMuted:     '#7d8590', //  5.0:1 (AA)
      darkBorder:  '#373e47',
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
      // Dark mode — warm sepia tones
      darkBgPage:  '#1a1610',
      darkBgCard:  '#221d15',
      darkBgInput: '#2a241b',
      darkBgHover: '#332c22',
      darkTextPrimary:   '#f5ebd5', // warm off-white, AAA on bg-page
      darkTextSecondary: '#ccbe9f', // ~7.7:1 (AAA)
      darkTextMuted:     '#9b8d72', // ~4.6:1 (AA)
      darkBorder:  '#3f372a',
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
      // Dark mode — deep forest tones
      darkBgPage:  '#0e1612',
      darkBgCard:  '#161e1a',
      darkBgInput: '#1d2722',
      darkBgHover: '#25302a',
      darkTextPrimary:   '#e6f0eb', // AAA on bg-page
      darkTextSecondary: '#b3c2b9', // ~8.2:1 (AAA)
      darkTextMuted:     '#85928a', // ~4.7:1 (AA)
      darkBorder:  '#2f3c34',
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
      // Dark mode — rich purple tones
      darkBgPage:  '#15111d',
      darkBgCard:  '#1d1828',
      darkBgInput: '#251f33',
      darkBgHover: '#2e2740',
      darkTextPrimary:   '#ebe5f3', // AAA on bg-page
      darkTextSecondary: '#b8b0c5', // ~7.6:1 (AAA)
      darkTextMuted:     '#8c8398', // ~4.6:1 (AA)
      darkBorder:  '#38304a',
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
