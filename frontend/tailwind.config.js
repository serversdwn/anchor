/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        anchor: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          200: '#e2e8f0'
        }
      }
    }
  },
  plugins: []
}
