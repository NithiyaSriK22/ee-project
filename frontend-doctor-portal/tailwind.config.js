/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        thunai: {
          ivory: '#FFF9F0',
          cream: '#FFFBF5',
          card: '#FFFDF9',
          navy: '#142B68',
          navyDark: '#0D1D47',
          slate: '#4B5267',
          muted: '#626A82',
          purple: '#7763C8',
          purpleHover: '#6552B5',
          lavender: '#A68ADF',
          lilac: '#E6D9F5',
          pale: '#F0E8FA',
          peach: '#F8D6C8',
          coral: '#F07886',
          border: '#E8DED8',
        },
        clinical: {
          bg: '#f8fafc',
          surface: '#ffffff',
          primary: '#dc2626', // Iconic Hospital Red
          primaryHover: '#b91c1c', // Deep Crimson
          primaryLight: '#fef2f2', // Soft Red Tint
          accent: '#ef4444', // Red-500
          cross: '#dc2626', // Classic Red Cross
          dark: '#0f172a',
          border: '#e2e8f0',
          borderRed: '#fecaca',
          verified: '#059669',
          unverified: '#d97706',
          unreadable: '#dc2626',
        },
      },
      boxShadow: {
        'thunai-card': '0 25px 70px -15px rgba(119, 99, 200, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
        'thunai-button': '0 10px 25px -5px rgba(119, 99, 200, 0.35)',
        'thunai-badge': '0 10px 30px -5px rgba(119, 99, 200, 0.18)',
      },
    },
  },
  plugins: [],
}
