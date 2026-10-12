/** @type {import('tailwindcss').Config} */

// Të gjitha ngjyrat e përdorura vijnë nga variablat CSS në src/theme.css, ku janë vlerat
// për temën e çelët dhe të errët. Kështu dark mode funksionon pa klasa `dark:` në çdo komponent.
// Klasat `indigo-*` dhe `brand-*` janë ngjyra e markës ("Petrol", --brand-*).
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const fromVars = (name) => Object.fromEntries(SHADES.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]));
const brand = fromVars('brand');

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--white) / <alpha-value>)',
        slate: fromVars('slate'),
        rose: fromVars('rose'),
        emerald: fromVars('emerald'),
        amber: fromVars('amber'),
        orange: fromVars('orange'),
        sky: fromVars('sky'),
        blue: fromVars('blue'),
        pink: fromVars('pink'),
        purple: fromVars('purple'),
        indigo: brand,
        brand
      },
      // Animacionet e modaleve: sfondi zbehet, kartela ngrihet nga poshtë (celular) ose zmadhohet (desktop)
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } }
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'sheet-up': 'sheet-up 260ms cubic-bezier(0.32, 0.72, 0, 1)',
        'pop-in': 'pop-in 180ms ease-out'
      }
    }
  },
  plugins: []
};
