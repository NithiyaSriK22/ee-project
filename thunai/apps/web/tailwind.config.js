/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        thunai: {
          white: 'var(--thunai-bg-white)',
          cream: {
            DEFAULT: 'var(--thunai-bg-cream)',
            light: 'var(--thunai-bg-cream-light)',
            card: 'var(--thunai-bg-cream-card)',
            dark: 'var(--thunai-bg-cream-dark)',
            border: 'var(--thunai-border)',
            borderStrong: 'var(--thunai-border-strong)',
          },
          red: {
            DEFAULT: 'var(--thunai-red-primary)',
            hover: 'var(--thunai-red-hover)',
            deep: 'var(--thunai-red-deep)',
            light: 'var(--thunai-red-light)',
            border: 'var(--thunai-red-border)',
          },
          text: {
            primary: 'var(--thunai-text-primary)',
            secondary: 'var(--thunai-text-secondary)',
            muted: 'var(--thunai-text-muted)',
          },
          state: {
            verified: 'var(--state-verified)',
            unverified: 'var(--state-unverified)',
            unreadable: 'var(--state-unreadable)',
            mismatch: 'var(--state-mismatch)',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
