/**
 * Design tokens do Hub de Trigo (paleta do deck — navy + dourado).
 * Fonte única de verdade: o tailwind.config.ts estende o tema a partir daqui.
 */

export const colors = {
  navy: {
    base: '#0B1733',
    card: '#12213F',
    card2: '#16264D',
    border: '#24386B',
  },
  text: {
    strong: '#FFFFFF',
    muted: '#C9D3E6',
    subtle: '#8A97B4',
  },
  gold: {
    primary: '#F5A623',
    light: '#FBB040',
  },
  semantic: {
    positive: '#35C08A',
    danger: '#E5484D',
    warning: '#F5A623',
    info: '#4C82F7',
  },
  /** Selos de ícone: círculo colorido com ícone branco. */
  iconBadge: {
    market: '#4C82F7',
    weather: '#F5A623',
    logistics: '#E5484D',
    internal: '#8A97B4',
  },
} as const

export const radius = {
  card: '12px',
  cardLg: '16px',
} as const

export const shadows = {
  card: '0 10px 30px -12px rgba(3, 8, 20, 0.55)',
  cardSoft: '0 4px 16px -8px rgba(3, 8, 20, 0.45)',
} as const

export const fonts = {
  display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
  sans: ['Inter', 'system-ui', 'sans-serif'],
}
