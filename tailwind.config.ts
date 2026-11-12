// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#0b0b0f', surface: '#16161d', line: '#26262f', fg: '#f2f2f5', muted: '#9a9aa8', accent: 'rgb(var(--accent) / <alpha-value>)' },
    },
  },
  plugins: [],
} satisfies Config
