/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        plum: {
          DEFAULT: 'rgb(var(--color-plum) / <alpha-value>)',
          raised: 'rgb(var(--color-plum-raised) / <alpha-value>)',
          line: 'rgb(var(--color-plum-line) / <alpha-value>)',
        },
        saffron: {
          DEFAULT: 'rgb(var(--color-saffron) / <alpha-value>)',
          deep: 'rgb(var(--color-saffron-deep) / <alpha-value>)',
        },
        chili: 'rgb(var(--color-chili) / <alpha-value>)',
        pista: 'rgb(var(--color-pista) / <alpha-value>)',
        sky: 'rgb(var(--color-sky) / <alpha-value>)',
        warm: {
          DEFAULT: 'rgb(var(--color-warm) / <alpha-value>)',
          dim: 'rgb(var(--color-warm-dim) / <alpha-value>)',
          faint: 'rgb(var(--color-warm-faint) / <alpha-value>)',
        },
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
