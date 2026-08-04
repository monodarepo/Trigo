/**
 * Contexto fixo do cenário-âncora da demo ("terça, 7h").
 * A contagem de alertas virá do snapshot diário nas próximas etapas.
 */
export const APP_CONTEXT = {
  dateLabel: 'Terça, 12 ago · 07:00',
  alertCount: 4,
  user: { initials: 'CPO', name: 'Diretoria de Suprimentos' },
  periodOptions: ['Trimestre atual', 'Próximo trimestre', 'Ano-safra 25/26'],
  millOptions: [
    'Todos os moinhos',
    'Fortaleza/CE',
    'Eusébio/CE',
    'Natal/RN',
    'Salvador/BA',
    'Cabedelo/PB',
    'Rolândia/PR',
    'Bento Gonçalves/RS',
  ],
} as const
