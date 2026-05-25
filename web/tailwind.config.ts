import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        hover: 'var(--bg-hover)',
        active: 'var(--bg-active)',
        accent: { DEFAULT: 'var(--accent)', hover: 'var(--accent-hover)', subtle: 'var(--accent-subtle)', text: 'var(--accent-text)' },
        border: { DEFAULT: 'var(--border-default)', strong: 'var(--border-strong)', focus: 'var(--border-focus)' },
        text: { primary: 'var(--text-primary)', secondary: 'var(--text-secondary)', tertiary: 'var(--text-tertiary)', muted: 'var(--text-muted)' },
      },
      fontFamily: {
        sans: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['11px', '16px'], sm: ['12px', '18px'], md: ['13px', '20px'], base: ['14px', '20px'],
        lg: ['16px', '24px'], xl: ['20px', '28px'], '2xl': ['24px', '32px'], '3xl': ['32px', '40px'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15,23,42,0.04)',
        md: '0 4px 12px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)',
        lg: '0 12px 32px rgba(15,23,42,0.12), 0 2px 4px rgba(15,23,42,0.04)',
      },
      borderRadius: { sm: '4px', md: '6px', lg: '8px', xl: '12px' },
    }
  },
  plugins: []
} satisfies Config
