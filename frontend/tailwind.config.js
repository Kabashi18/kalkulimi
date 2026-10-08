/** @type {import('tailwindcss').Config} */

// Ngjyra e markës vjen nga variablat CSS në src/index.css (--brand-50 ... --brand-950).
// Klasat ekzistuese `indigo-*` (bg-indigo-600, text-indigo-700, ...) i përdorin këto variabla,
// kështu që ngjyra e gjithë aplikacionit ndryshohet në një vend të vetëm.
const brandShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const brand = Object.fromEntries(brandShades.map((s) => [s, `rgb(var(--brand-${s}) / <alpha-value>)`]));

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        indigo: brand,
        brand
      }
    }
  },
  plugins: []
};
