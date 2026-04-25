/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        pop: {
          '0%':   { transform: 'scale(1)' },
          '35%':  { transform: 'scale(1.45)' },
          '65%':  { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pop:          'pop 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'fade-in-up': 'fade-in-up 0.25s ease-out both',
      },
      colors: {
        brand: {
          50:  'var(--brand-brand50, #eef2ff)',
          100: 'var(--brand-brand100, #e0e7ff)',
          200: 'var(--brand-brand200, #c7d2fe)',
          400: 'var(--brand-brand400, #818cf8)',
          500: 'var(--brand-brand500, #6366f1)',
          600: 'var(--brand-brand600, #4f46e5)',
          700: 'var(--brand-brand700, #4338ca)',
        },
        // ── Dark mode design tokens ──────────────────────────────────────────
        // These reference CSS variables defined in index.css.
        // Usage: dark:bg-dm-card, dark:text-dm-secondary, dark:border-dm-border
        // This keeps the palette in one place — change vars to retheme globally.
        dm: {
          // Backgrounds (elevation stack)
          page:    'var(--bg-page)',      // Deepest — #0d1117 in dark
          card:    'var(--bg-card)',      // Cards / panels — #161b22
          input:   'var(--bg-input)',     // Inputs / insets — #1c2128
          hover:   'var(--bg-hover)',     // Hover — #21262d
          active:  'var(--bg-active)',    // Pressed / selected — #2d333b
          // Borders
          border:  'var(--border-input)', // Standard border — #30363d
          subtle:  'var(--border-card)',  // Subtle divider — #21262d
          strong:  'var(--border-strong)',// Emphasis / focus — #484f58
          // Text
          primary:   'var(--text-primary)',   // #e6edf3 — 14.9:1 AAA
          secondary: 'var(--text-secondary)', // #8b949e — 6.1:1 AA
          muted:     'var(--text-muted)',     // #6e7681 — 4.6:1 AA
          disabled:  'var(--text-disabled)',  // #484f58 — disabled only
          // Brand
          brand:     'var(--brand-400)',      // #818cf8 — 6.8:1 AA on dark card
        },
      },
    },
  },
  plugins: [],
}
