/**
 * CHEGADA AO VIVO de alertas — o produtor que exercita `adicionar` do store.
 *
 * Regra que governa este arquivo (CLAUDE.md § periferia ao vivo, núcleo
 * encenado): o alerta que chega NÃO move a decisão do dia. Ele é um sinal de
 * periferia — uma confirmação de mercado, uma janela que abriu — e por isso
 * nasce com severidade média ou informativa. Um crítico chegando sozinho
 * mudaria a recomendação sem que ninguém tivesse decidido nada, e a demo
 * passaria a contar duas histórias.
 *
 * O que ele PROVA, e é por isso que existe: o sino sobe, a tela de Alertas
 * ganha a linha e o banner contextual aparece — tudo ao mesmo tempo, porque
 * são a mesma fonte. Antes da consolidação, um alerta novo teria de ser
 * inserido em três lugares.
 */
import type { Alerta } from '../data/types'
import { emitirToast } from '../components/feedback/toastBus'
import { adicionar } from './alertStore'
import { abrirCentral, centralEstaAberta } from './centralStore'
import { SEVERIDADE_UI } from './severidade'

/**
 * Roteiro da sessão: segundo em que cada alerta entra. Os tempos são folgados
 * de propósito — o primeiro cai depois de o operador ter olhado a tela, não
 * durante a montagem.
 */
interface ChegadaProgramada {
  aosSegundos: number
  alerta: Alerta
}

const ROTEIRO: ChegadaProgramada[] = [
  {
    aosSegundos: 75,
    alerta: {
      id: 'alerta-vivo-fila-pecem',
      severidade: 'medio',
      categoria: 'logistica',
      titulo: 'Fila em Pecém subiu para 4 navios',
      descricao:
        'A janela de atracação da compra recomendada passa de 2 para 4 navios na fila. Ainda cabe nos 5 dias da ' +
        'janela, mas a folga caiu: uma nova entrada empurraria a descarga para depois do prazo e reabriria o risco ' +
        'de demurrage que o MV Río Paraná já materializou.',
      timestamp: '2025-08-12T07:04:00',
      impactoRs: 180_000,
      tipo: 'risco',
      impactoBase: 'evento',
      impactoNota: 'demurrage adicional se a fila crescer de novo',
      status: 'novo',
      exigeDecisao: true,
      acaoLabel: 'Ver janela de descarga',
      acaoRota: '/tlc',
      entidade: { tipo: 'porto', id: 'pecem' },
      telasRelacionadas: ['/tlc', '/compra'],
      fonte: 'Autoridade portuária de Pecém — fila de atracação (ao vivo)',
      agenteId: 'originacao',
    },
  },
  {
    aosSegundos: 140,
    alerta: {
      id: 'alerta-vivo-cotacao-massa-ne',
      severidade: 'informativo',
      categoria: 'farinha',
      titulo: 'Nova cotação comparável de farinha de massas no Nordeste',
      descricao:
        'Terceiro moageiro da amostra atualizou a oferta industrial em granel, posto fábrica. A cotação entra na ' +
        'mesma base do custo interno — se a média subir, o ganho da verticalização sobe junto, sem que nada tenha ' +
        'mudado dentro do moinho.',
      timestamp: '2025-08-12T07:06:00',
      status: 'novo',
      exigeDecisao: false,
      acaoLabel: 'Ver mercado de farinha',
      acaoRota: '/previsao',
      telasRelacionadas: ['/previsao', '/verticalizacao'],
      fonte: 'Cotação de moageiros independentes CE/PE (ao vivo)',
      agenteId: 'mercado',
    },
  },
]

/** Ids já publicados nesta sessão — o roteiro não repete. */
const publicados = new Set<string>()

/**
 * Chamado a cada segundo pelo tick global. Idempotente: reentrar no mesmo
 * segundo (ou voltar no tempo) não republica, e o próprio `adicionar` do store
 * ainda protege por id caso isto seja chamado de outro lugar.
 */
export function publicarChegadasAte(segundos: number) {
  for (const c of ROTEIRO) {
    if (segundos < c.aosSegundos || publicados.has(c.alerta.id)) continue
    publicados.add(c.alerta.id)
    /* `recebidoEmS` carimba o segundo da sessão: é o que faz a Central dizer
       "há 12s" em vez de ler o timestamp do cenário, que está adiante das 07h
       e viraria um "em 4 min". */
    adicionar({ ...c.alerta, recebidoEmS: segundos })
    anunciar(c.alerta)
  }
}

/**
 * O toast é o único aviso — sem som, na cor da severidade. Ele não repete a
 * descrição inteira: diz o que chegou, quanto vale e abre a Central, onde a
 * decisão acontece.
 *
 * Com a Central aberta, o toast só é dispensável para quem ENTRA nela: a
 * Central lista a fila de decisão, então um informativo continua precisando do
 * toast — suprimi-lo faria o alerta chegar em silêncio absoluto, sem aparecer
 * em lugar nenhum da tela em que a pessoa está.
 */
function anunciar(alerta: Alerta) {
  if (centralEstaAberta() && alerta.exigeDecisao) return
  const ui = SEVERIDADE_UI[alerta.severidade]
  emitirToast({
    tom: ui.tomToast,
    aoVivo: true,
    titulo: alerta.titulo,
    descricao:
      alerta.impactoRs != null
        ? `${ui.rotulo} · ${alerta.tipo === 'oportunidade' ? '+' : '−'}R$ ${Math.round(
            alerta.impactoRs / 1000,
          ).toLocaleString('pt-BR')} mil${alerta.impactoNota ? ` — ${alerta.impactoNota}` : ''}`
        : `${ui.rotulo} · ${alerta.fonte}`,
    acao: { rotulo: 'Abrir Central de Alertas', executar: abrirCentral },
  })
}

/** Reinicia o roteiro — usado junto com o reset do modo apresentação. */
export function reiniciarChegadas() {
  publicados.clear()
}

export const CHEGADAS_PROGRAMADAS = ROTEIRO.length
