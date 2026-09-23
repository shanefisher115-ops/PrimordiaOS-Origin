/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primordia: {
          900: '#08090e',
          800: '#0f1424',
          700: '#172038',
          600: '#233054',
          gold: '#f59e0b',
          cyan: '#06b6d4',
          emerald: '#10b981',
          crimson: '#f43f5e'
        }
      }
    },
  },
  plugins: [],
}
