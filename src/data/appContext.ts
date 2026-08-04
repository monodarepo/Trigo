import { MOINHOS } from './dominio'
import { formatDataHoraPt } from './format'

/** Instante do cenário-âncora da demo ("terça, 7h"). */
export const DEMO_AGORA = '2025-08-12T07:00:00'

/** Contexto fixo da Topbar. A contagem do sino vem do snapshot (alertas.ts). */
export const APP_CONTEXT: {
  dateLabel: string
  user: { initials: string; name: string }
  periodOptions: string[]
  millOptions: string[]
} = {
  dateLabel: formatDataHoraPt(DEMO_AGORA),
  user: { initials: 'CPO', name: 'Diretoria de Suprimentos' },
  periodOptions: ['Trimestre atual', 'Próximo trimestre', 'Ano-safra 25/26'],
  millOptions: ['Todos os moinhos', ...MOINHOS.map((m) => `${m.nome}/${m.uf}`)],
}
