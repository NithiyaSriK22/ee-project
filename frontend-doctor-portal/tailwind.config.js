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
          bg: '#f1f5f9',
          surface: '#ffffff',
          primary: '#0f766e', // Deep Clinical Teal
          primaryHover: '#115e59',
          accent: '#0284c7', // Slate Blue
          dark: '#0f172a',
          border: '#cbd5e1',
          verified: '#059669',
          unverified: '#d97706',
          unreadable: '#e11d48',
        },
      },
    },
  },
  plugins: [],
}
