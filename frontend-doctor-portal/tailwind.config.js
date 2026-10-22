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
    },
  },
  plugins: [],
}
