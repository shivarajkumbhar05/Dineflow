/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#170A28',      // aubergine base
        plum: { DEFAULT: '#241039', raised: '#2F1650', line: '#43266B' },
        saffron: { DEFAULT: '#FFB020', deep: '#E58E00' },
        chili: '#FF5A4E',
        pista: '#3DDC97',
        sky: '#5CC8FF',
        warm: { DEFAULT: '#FFF4E4', dim: '#BBA9D1', faint: '#8670A6' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,176,32,.35), 0 12px 40px -8px rgba(255,176,32,.35)',
        lift: '0 18px 50px -18px rgba(0,0,0,.7)',
      },
    },
  },
  plugins: [],
};
