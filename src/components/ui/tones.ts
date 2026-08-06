export type Tone = 'neutral' | 'gold' | 'positive' | 'warning' | 'danger' | 'info'

/** Classes para chips/badges: borda + fundo translúcido + texto na cor do tom. */
export const toneBadgeClasses: Record<Tone, string> = {
  neutral: 'border-edge bg-card-2 text-ink-muted',
  gold: 'border-gold/40 bg-gold/15 text-gold-light',
  positive: 'border-positive/40 bg-positive/15 text-positive',
  warning: 'border-warning/40 bg-warning/15 text-warning',
  danger: 'border-danger/40 bg-danger/15 text-danger',
  /* info a 10% e não 15%: o azure sobre o próprio fundo a 15% dá 4,19:1 sobre
     o card — abaixo do AA de 4,5 para texto normal. A 10% sobe para 4,55:1 e a
     diferença visual de 5% de alfa é imperceptível. */
  info: 'border-info/40 bg-info/10 text-info',
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
