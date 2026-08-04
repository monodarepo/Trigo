/**
 * Dados de exemplo APENAS para a página /showcase (QA dos primitivos de UI).
 * Valores alinhados ao cenário-âncora do CLAUDE.md.
 */
export const SHOWCASE = {
  kpis: [
    {
      label: 'TLC recomendado',
      value: 'R$ 1.480',
      unit: '/t',
      delta: { label: '−R$ 40/t vs baseline', direction: 'down', tone: 'positive' },
      hint: 'Baseline R$ 1.520/t',
    },
    {
      label: 'Prob. de alta em 15 dias',
      value: '72%',
      delta: { label: '+6 p.p. na semana', direction: 'up', tone: 'warning' },
    },
    {
      label: 'Impacto protegido',
      value: 'R$ 4,8M',
      delta: { label: 'Hedge de 60% da exposição', direction: 'flat', tone: 'neutral' },
    },
  ],
  sparklines: {
    cbot: [205, 208, 204, 210, 214, 212, 218, 221, 219, 226],
    cambio: [5.31, 5.28, 5.24, 5.26, 5.22, 5.2, 5.21, 5.18, 5.2, 5.2],
  },
  confidence: 72,
  recommendation: {
    title: 'Antecipar compra de 32.000 t — Argentina via Pecém',
    rationale:
      'Probabilidade de alta de 72% em 15 dias, prêmio FOB Argentina favorável e janela logística de 5 dias. Blend de 65% Argentina + 35% EUA (HRW) atende massas e pães sem comprometer o custo.',
    stats: [
      { label: 'Volume', value: '32.000 t' },
      { label: 'Janela', value: '5 dias' },
      { label: 'TLC', value: 'R$ 1.480/t', hint: 'vs R$ 1.520/t baseline' },
      { label: 'Economia', value: 'R$ 40/t' },
    ],
  },
  tlcTable: [
    { origem: 'Argentina', porto: 'Pecém/CE', volume: '32.000 t', tlc: 'R$ 1.480', risco: 'baixo' },
    { origem: 'EUA-Golfo (HRW)', porto: 'Suape/PE', volume: '18.000 t', tlc: 'R$ 1.512', risco: 'medio' },
    { origem: 'Canadá (CWRS)', porto: 'Pecém/CE', volume: '12.000 t', tlc: 'R$ 1.546', risco: 'alto' },
  ],
} as const

export type ShowcaseTlcRow = (typeof SHOWCASE.tlcTable)[number]
