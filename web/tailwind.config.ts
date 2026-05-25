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
        xs: ['17px', '24px'], sm: ['18px', '27px'], md: ['20px', '30px'], base: ['21px', '30px'],
        lg: ['24px', '36px'], xl: ['30px', '42px'], '2xl': ['36px', '48px'], '3xl': ['48px', '60px'],
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
