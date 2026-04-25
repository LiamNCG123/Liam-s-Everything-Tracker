import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage'

export const THEMES = [
  {
    key: 'slate',
    label: 'Slate',
    desc: 'Clean & professional',
    colors: {
      // Light — cool blue-tinted surfaces
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
      // Dark — deep charcoal, truly dark
      darkBgPage:  '#0a0e14',
      darkBgCard:  '#111820',
      darkBgInput: '#192030',
      darkBgHover: '#202a3c',
      darkTextPrimary:   '#e2eaf5',
      darkTextSecondary: '#94aabf',
      darkTextMuted:     '#627485',
      darkBorder:  '#2a3848',
      darkBrand500: '#60a5fa',
    },
  },
  {
    key: 'amber',
    label: 'Amber',
    desc: 'Warm & inviting',
    colors: {
      // Light — warm parchment/cream surfaces
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
      // Dark — deep warm dark, truly dark
      darkBgPage:  '#120d04',
      darkBgCard:  '#1c140a',
      darkBgInput: '#261c10',
      darkBgHover: '#302416',
      darkTextPrimary:   '#f5e8cc',
      darkTextSecondary: '#c8a872',
      darkTextMuted:     '#8a6e42',
      darkBorder:  '#3a2c18',
      darkBrand500: '#fbbf24',
    },
  },
  {
    key: 'emerald',
    label: 'Emerald',
    desc: 'Natural & calm',
    colors: {
      // Light — fresh mint/sage surfaces
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
      // Dark — deep forest, truly dark
      darkBgPage:  '#060f0a',
      darkBgCard:  '#0d1c14',
      darkBgInput: '#14261c',
      darkBgHover: '#1b3025',
      darkTextPrimary:   '#ceeee0',
      darkTextSecondary: '#72b092',
      darkTextMuted:     '#468060',
      darkBorder:  '#1e3828',
      darkBrand500: '#34d399',
    },
  },
  {
    key: 'violet',
    label: 'Violet',
    desc: 'Creative & modern',
    colors: {
      // Light — soft lavender surfaces
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
      // Dark — deep purple, truly dark
      darkBgPage:  '#0c0818',
      darkBgCard:  '#141026',
      darkBgInput: '#1c1832',
      darkBgHover: '#24203e',
      darkTextPrimary:   '#e8d8ff',
      darkTextSecondary: '#b090d8',
      darkTextMuted:     '#7a5aa8',
      darkBorder:  '#2c2448',
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
  root.style.setProperty('--brand-50',  c.brand50)
  root.style.setProperty('--brand-100', c.brand100)
  root.style.setProperty('--brand-400', c.brand400)
  root.style.setProperty('--brand-500', c.brand500)
  root.style.setProperty('--brand-600', c.brand600)

  // Dark mode CSS variables (read by html.dark via var(--dark-*))
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
