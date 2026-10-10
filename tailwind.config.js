/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vex: {
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          primary: '#0284c7',
          accent: '#38bdf8',
          red: '#ef4444',
          'red-light': '#f87171',
          'red-dark': '#991b1b',
          blue: '#3b82f6',
          'blue-light': '#60a5fa',
          'blue-dark': '#1e40af',
          yellow: '#eab308',
          'yellow-light': '#fde047',
          'yellow-dark': '#a16207',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      }
    },
  },
  plugins: [],
}
