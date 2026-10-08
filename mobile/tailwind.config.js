/** @type {import('tailwindcss').Config} */

// Ngjyra e markës "Petrol" (e njëjtë me frontend/src/index.css). Klasat `indigo-*` e përdorin këtë paletë.
const brand = {
  50: '#ecfeff',
  100: '#cffafe',
  200: '#a5f3fc',
  300: '#67e8f9',
  400: '#06b6d4',
  500: '#0891b2',
  600: '#0e7490',
  700: '#155e75',
  800: '#164e63',
  900: '#083344',
  950: '#04232e'
};

module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: { indigo: brand, brand }
    }
  },
  plugins: []
};
