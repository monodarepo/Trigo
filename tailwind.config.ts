import type { Config } from 'tailwindcss'
import { colors, fonts, radius, shadows, typeScale } from './src/theme/tokens'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        /* Ultrawide / command center: o Cockpit vira grid de parede */
        wide: '1800px',
      },
      colors: {
        // Superfícies em camadas (v2)
        base: colors.surface.base,
        surface: { 1: colors.surface.s1, 2: colors.surface.s2, 3: colors.surface.s3 },
        // Aliases v1 — mantêm as classes existentes no novo sistema
        navy: colors.navy.base,
        card: { DEFAULT: colors.navy.card, 2: colors.navy.card2 },
        edge: { DEFAULT: colors.navy.border, strong: '#2A3445' },
        ink: {
          DEFAULT: colors.text.strong,
          muted: colors.text.muted,
          subtle: colors.text.subtle,
          faint: colors.text.faint,
        },
        gold: {
          DEFAULT: colors.gold.primary,
          light: colors.gold.light,
          bright: colors.gold.light,
        },
        positive: colors.semantic.positive,
        danger: colors.semantic.danger,
        warning: colors.semantic.warning,
        info: colors.semantic.info,
        // Sinônimos semânticos v2 + extras de rampa
        emerald: colors.semantic.positive,
        rose: colors.semantic.danger,
        azure: colors.semantic.info,
        violet: colors.semantic.violet,
        cyan: colors.semantic.cyan,
      },
      fontFamily: {
        display: fonts.display,
        sans: fonts.sans,
        mono: fonts.mono,
      },
      fontSize: Object.fromEntries(
        Object.entries(typeScale).map(([k, [size, lineHeight]]) => [k, [size, { lineHeight }]]),
      ),
      borderRadius: {
        card: radius.card,
        'card-lg': radius.cardLg,
      },
      boxShadow: {
        card: shadows.card,
        raised: shadows.raised,
        'card-gold': shadows.cardGold,
        'card-rose': shadows.cardRose,
        'card-soft': shadows.card,
      },
    },
  },
  plugins: [],
} satisfies Config
