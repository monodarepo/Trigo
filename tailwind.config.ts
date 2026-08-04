import type { Config } from 'tailwindcss'
import { colors, fonts, radius, shadows } from './src/theme/tokens'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: colors.navy.base,
        card: { DEFAULT: colors.navy.card, 2: colors.navy.card2 },
        edge: colors.navy.border,
        ink: {
          DEFAULT: colors.text.strong,
          muted: colors.text.muted,
          subtle: colors.text.subtle,
        },
        gold: { DEFAULT: colors.gold.primary, light: colors.gold.light },
        positive: colors.semantic.positive,
        danger: colors.semantic.danger,
        warning: colors.semantic.warning,
        info: colors.semantic.info,
      },
      fontFamily: {
        display: fonts.display,
        sans: fonts.sans,
      },
      borderRadius: {
        card: radius.card,
        'card-lg': radius.cardLg,
      },
      boxShadow: {
        card: shadows.card,
        'card-soft': shadows.cardSoft,
      },
    },
  },
  plugins: [],
} satisfies Config
