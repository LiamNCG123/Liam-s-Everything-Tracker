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
          50:  'var(--brand-50, #eff6ff)',
          100: 'var(--brand-100, #dbeafe)',
          400: 'var(--brand-400, #60a5fa)',
          500: 'var(--brand-500, #2563eb)',
          600: 'var(--brand-600, #1d4ed8)',
        },
        // ── Theme-aware design tokens ────────────────────────────────────
        // These reference CSS variables in index.css that change based on theme.
        // Light mode backgrounds and text respond to theme automatically.
        // Dark mode uses dm-* prefix for backwards compatibility.
        dm: {
          // Backgrounds (elevation stack)
          page:    'var(--bg-page)',      // Theme-aware
          card:    'var(--bg-card)',      // Theme-aware
          input:   'var(--bg-input)',     // Theme-aware
          hover:   'var(--bg-hover)',     // Theme-aware
          active:  'var(--bg-active)',    // Pressed / selected
          // Borders
          border:  'var(--border-input)', // Theme-aware
          subtle:  'var(--border-card)',  // Theme-aware
          strong:  'var(--border-strong)',// Emphasis / focus
          // Text
          primary:   'var(--text-primary)',   // Theme-aware
          secondary: 'var(--text-secondary)', // Theme-aware
          muted:     'var(--text-muted)',     // Theme-aware
          disabled:  'var(--text-disabled)',  // Disabled only
          // Brand
          brand:     'var(--brand-400)',      // Theme-aware
        },
      },
    },
  },
  plugins: [],
}
