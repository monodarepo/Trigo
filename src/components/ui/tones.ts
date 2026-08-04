export type Tone = 'neutral' | 'gold' | 'positive' | 'warning' | 'danger' | 'info'

/** Classes para chips/badges: borda + fundo translúcido + texto na cor do tom. */
export const toneBadgeClasses: Record<Tone, string> = {
  neutral: 'border-edge bg-card-2 text-ink-muted',
  gold: 'border-gold/40 bg-gold/15 text-gold-light',
  positive: 'border-positive/40 bg-positive/15 text-positive',
  warning: 'border-warning/40 bg-warning/15 text-warning',
  danger: 'border-danger/40 bg-danger/15 text-danger',
  info: 'border-info/40 bg-info/15 text-info',
}

/** Classes só de texto, para deltas e valores coloridos. */
export const toneTextClasses: Record<Tone, string> = {
  neutral: 'text-ink-subtle',
  gold: 'text-gold-light',
  positive: 'text-positive',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
}
