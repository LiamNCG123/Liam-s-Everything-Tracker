import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage'

export const THEMES = [
  {
    key: 'indigo',
    label: 'Indigo',
    emoji: '🔵',
    desc: 'Professional & focused',
    colors: {
      brand50:  '#eef2ff',
      brand100: '#e0e7ff',
      brand200: '#c7d2fe',
      brand400: '#818cf8',
      brand500: '#6366f1',
      brand600: '#4f46e5',
      brand700: '#4338ca',
    },
  },
  {
    key: 'sunset',
    label: 'Sunset',
    emoji: '🌅',
    desc: 'Warm & creative',
    colors: {
      brand50:  '#fef3f2',
      brand100: '#fee4e2',
      brand200: '#fecdca',
      brand400: '#f97066',
      brand500: '#f04438',
      brand600: '#d92d20',
      brand700: '#b42318',
    },
  },
  {
    key: 'forest',
    label: 'Forest',
    emoji: '🌲',
    desc: 'Calm & grounded',
    colors: {
      brand50:  '#f0fdf4',
      brand100: '#dcfce7',
      brand200: '#bbf7d0',
      brand400: '#4ade80',
      brand500: '#22c55e',
      brand600: '#16a34a',
      brand700: '#15803d',
    },
  },
  {
    key: 'ocean',
    label: 'Ocean',
    emoji: '🌊',
    desc: 'Cool & flowing',
    colors: {
      brand50:  '#f0f9ff',
      brand100: '#e0f2fe',
      brand200: '#bae6fd',
      brand400: '#38bdf8',
      brand500: '#0ea5e9',
      brand600: '#0284c7',
      brand700: '#0369a1',
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
  if (!themeObj) return

  const root = document.documentElement
  Object.entries(themeObj.colors).forEach(([key, value]) => {
    root.style.setProperty(`--brand-${key}`, value)
  })
}

// Initialize theme on app load
export function initTheme() {
  const theme = load('theme') || 'indigo'
  applyTheme(theme)
}
