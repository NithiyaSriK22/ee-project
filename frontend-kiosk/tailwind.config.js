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
        kiosk: {
          bg: '#f8fafc',
          card: '#ffffff',
          primary: '#0284c7', // Calm Trustworthy Sky Blue
          primaryHover: '#0369a1',
          accent: '#0d9488', // Reassuring Teal
          text: '#0f172a',
          textMuted: '#475569',
          border: '#e2e8f0',
          emergency: '#e11d48',
          success: '#16a34a',
          warning: '#d97706',
        }
      },
      fontSize: {
        'kiosk-sm': ['1.125rem', { lineHeight: '1.75rem' }],
        'kiosk-base': ['1.25rem', { lineHeight: '1.85rem' }],
        'kiosk-lg': ['1.5rem', { lineHeight: '2rem' }],
        'kiosk-xl': ['1.875rem', { lineHeight: '2.25rem' }],
        'kiosk-2xl': ['2.25rem', { lineHeight: '2.6rem' }],
        'kiosk-3xl': ['3rem', { lineHeight: '1.15' }],
      },
      minHeight: {
        'touch-target': '64px',
      },
      minWidth: {
        'touch-target': '64px',
      },
    },
  },
  plugins: [],
}
