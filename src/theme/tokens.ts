/**
 * Design tokens v2 da Wheat & Flour Value Tower — superfícies em camadas (Palantir/Stripe).
 * Fonte única de verdade: o tailwind.config.ts estende o tema a partir daqui.
 *
 * Compatibilidade: as chaves v1 (navy.card, text.muted, semantic.positive…)
 * são mantidas apontando para os valores v2 — os componentes existentes
 * herdam o novo sistema sem reescrita.
 */

export const colors = {
  /** Superfícies em camadas: base → painel → card → raised/hover. */
  surface: {
    base: '#0A101F',
    s1: '#0E1626',
    s2: '#131D30',
    s3: '#1A2740',
  },
  /** Fios (hairlines) — nunca bordas grossas. */
  hairline: {
    DEFAULT: 'rgba(255,255,255,0.06)',
    strong: 'rgba(255,255,255,0.10)',
    top: 'rgba(255,255,255,0.05)',
  },
  /** Aliases v1 (navy.*) → valores v2. `border` é o hairline pré-composto sobre surface-2. */
  navy: {
    base: '#0A101F',
    card: '#131D30',
    card2: '#1A2740',
    border: '#212B3C',
  },
  text: {
    strong: '#F4F7FF',
    muted: '#C4CEE0',
    subtle: '#8593AC',
    faint: '#5C6883',
  },
  /** Dourado = decisão / valor da IA (accent primário). */
  gold: {
    primary: '#F5A623',
    light: '#FBB454',
  },
  /** Cor como sintaxe: esmeralda=positivo · rosa=risco · azure=informativo. */
  semantic: {
    positive: '#2FBF8F',
    danger: '#FB5B67',
    warning: '#F5A623',
    info: '#5B8DEF',
    violet: '#9B7BF0',
    cyan: '#3FC9D6',
  },
  /** Selos de ícone: círculo colorido com ícone branco. */
  iconBadge: {
    market: '#5B8DEF',
    weather: '#F5A623',
    logistics: '#FB5B67',
    internal: '#8593AC',
  },
} as const

/** Rampa categórica para séries de gráficos (ordem fixa). */
export const dataRamp = ['#F5A623', '#5B8DEF', '#2FBF8F', '#9B7BF0', '#FB5B67', '#3FC9D6'] as const

/** Gradiente de decisão (heros/estados ativos). */
export const gradientGold = `linear-gradient(135deg, ${colors.gold.primary}, ${colors.gold.light})`

export const radius = {
  card: '14px',
  cardLg: '16px',
} as const

/** Elevação por sombra suave + top-highlight (o card "iluminado por cima"). */
export const shadows = {
  card: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 32px -16px rgba(2,6,16,0.65)',
  raised: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 20px 48px -20px rgba(2,6,16,0.75)',
  cardGold: 'inset 0 1px 0 rgba(245,166,35,0.28), 0 12px 32px -16px rgba(2,6,16,0.65)',
  cardRose: 'inset 0 1px 0 rgba(251,91,103,0.25), 0 12px 32px -16px rgba(2,6,16,0.65)',
} as const

export const fonts = {
  display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
}

/** Escala tipográfica rígida (px) — use via text-11 … text-56. */
export const typeScale = {
  11: ['11px', '16px'],
  12: ['12px', '18px'],
  13: ['13px', '19px'],
  14: ['14px', '21px'],
  16: ['16px', '24px'],
  20: ['20px', '28px'],
  28: ['28px', '34px'],
  40: ['40px', '46px'],
  56: ['56px', '62px'],
} as const
