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
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
    },
  },
  plugins: [],
}
