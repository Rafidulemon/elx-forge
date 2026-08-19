/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './popup.html', './src/ui/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        panel: 'var(--color-panel)',
        elev: 'var(--color-elev)',
        hover: 'var(--color-hover)',
        line: 'var(--color-line)',
        ink: 'var(--color-ink)',
        'ink-dim': 'var(--color-ink-dim)',
        brand: 'var(--color-brand)',
        'brand-dim': 'var(--color-brand-dim)',
        ok: 'var(--color-ok)',
        warn: 'var(--color-warn)',
        err: 'var(--color-err)',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"Cascadia Code"', 'Consolas', '"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        pop: '0 12px 40px rgba(0, 0, 0, 0.35)',
        focus: '0 0 0 2px var(--color-brand-dim)',
      },
      animation: {
        'fade-in': 'fadeIn 0.16s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-in': 'slideIn 0.22s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
