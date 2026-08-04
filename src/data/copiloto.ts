import type { MensagemCopiloto, PerguntaResposta } from './types'
import { RECOMENDACAO_COMPRA } from './compra'
import { RECOMENDACAO_HEDGE } from './hedge'
import { MV_RIO_PARANA } from './logistica'
import { PRECOS_ATUAIS } from './mercado'
import { TLC_BASELINE_RS, TLC_RECOMENDADO_RS } from './tlc'
import { formatBRL, formatTon } from './format'

export const PERGUNTAS_SUGERIDAS: string[] = [
  'Por que antecipar 18% do trimestre agora?',
  'Como o TLC de R$ 1.480/t foi calculado?',
  'Qual o impacto do atraso do MV Río Paraná?',
  'O que acontece se o dólar for a R$ 5,45?',
  'Por que blend 65/35 e não 70/30?',
  'Onde estou mais exposto no câmbio?',
]

/** Conversa inicial exibida ao abrir o Copiloto (resumo do dia). */
export const CONVERSA_INICIAL: MensagemCopiloto[] = [
  {
    id: 'msg-boas-vindas',
    autor: 'copiloto',
    timestamp: '2025-08-12T07:00:00',
    texto:
      'Bom dia. Resumo de hoje: recomendo antecipar 18% do volume do trimestre ' +
      `(${formatTon(RECOMENDACAO_COMPRA.volumeToneladas)} da Argentina via Pecém, TLC de ${formatBRL(TLC_RECOMENDADO_RS)}/t) ` +
      `e proteger 60% da exposição cambial de 90 dias (${formatBRL(RECOMENDACAO_HEDGE.protecaoEstimadaRs, { compacto: true })} de proteção). ` +
      `Impacto protegido combinado: R$ 4,8M. Probabilidade de alta do trigo em 15 dias: ${PRECOS_ATUAIS.probAltaTrigo15dPct}%. ` +
      `Ponto de atenção: ${MV_RIO_PARANA.navio} com +${MV_RIO_PARANA.atrasoDias} dias de atraso afeta a cobertura de Natal.`,
    referencias: [
      { rotulo: 'Recomendação de Compra', rota: '/compra' },
      { rotulo: 'Recomendação de Hedge', rota: '/hedge' },
      { rotulo: 'Alertas do dia', rota: '/alertas' },
    ],
  },
]

/** Respostas mockadas — mesmos números das telas (verdade única). */
export const RESPOSTAS_MOCK: PerguntaResposta[] = [
  {
    id: 'resp-antecipar',
    pergunta: 'Por que antecipar 18% do trimestre agora?',
    resposta:
      `Três razões se combinam hoje. (1) Preço: o modelo dá ${PRECOS_ATUAIS.probAltaTrigo15dPct}% de probabilidade de alta em 15 dias — ` +
      'a Bolsa de Cereales cortou a safra argentina em 2,1 Mt e o Mar Negro segue seco; a projeção de 30 dias é US$ 214/t vs US$ 205/t hoje. ' +
      '(2) Logística: há uma janela de frete Up River de 5 dias antes da disputa com embarques de milho, com fila curta em Pecém. ' +
      `(3) Estoque: Fortaleza está com 21 dias de cobertura (política: 30) e Natal caiu para 19 com o atraso do ${MV_RIO_PARANA.navio}. ` +
      `Antecipar ${formatTon(RECOMENDACAO_COMPRA.volumeToneladas)} (18% das ${formatTon(RECOMENDACAO_COMPRA.volumeTrimestreToneladas)} do trimestre) ` +
      `trava TLC de ${formatBRL(TLC_RECOMENDADO_RS)}/t vs baseline de ${formatBRL(TLC_BASELINE_RS)}/t — economia de R$ 40/t, ` +
      `${formatBRL(RECOMENDACAO_COMPRA.economiaTotalRs, { compacto: true })} no lote.`,
    referencias: [
      { rotulo: 'Recomendação de Compra', rota: '/compra' },
      { rotulo: 'Previsão de Preço', rota: '/previsao' },
    ],
  },
  {
    id: 'resp-tlc',
    pergunta: 'Como o TLC de R$ 1.480/t foi calculado?',
    resposta:
      'Soma de 12 componentes da alternativa Argentina · Pecém, a câmbio de R$ 5,20: ' +
      'FOB CBOT R$ 1.066,00 + prêmio origem R$ 249,60 (FOB total US$ 253/t) + frete marítimo R$ 98,80 (US$ 19/t) + ' +
      'seguro R$ 3,90 + AFRMM R$ 7,90 + imposto R$ 0 (Mercosul) + despesas portuárias R$ 16,60 + ' +
      'demurrage-risco R$ 5,80 + armazenagem R$ 4,90 + transporte interno R$ 9,80 + proteção cambial R$ 3,20 + ' +
      `custo de capital R$ 13,50 = ${formatBRL(TLC_RECOMENDADO_RS)}/t. ` +
      `O baseline de ${formatBRL(TLC_BASELINE_RS)}/t assume compra em ~30 dias ao preço projetado, com frete mais caro e maior risco de demurrage.`,
    referencias: [{ rotulo: 'Decomposição do TLC', rota: '/tlc' }],
  },
  {
    id: 'resp-rio-parana',
    pergunta: 'Qual o impacto do atraso do MV Río Paraná?',
    resposta:
      `O ${MV_RIO_PARANA.navio} (${formatTon(MV_RIO_PARANA.volumeToneladas)} da Argentina para o porto de Natal) ` +
      `atrasou +${MV_RIO_PARANA.atrasoDias} dias — nova ETA 20/08. Dois efeitos: risco de demurrage estimado em ` +
      `${formatBRL(MV_RIO_PARANA.riscoDemurrageRs!, { compacto: true })} e cobertura do Moinho Natal reduzida para 19 dias ` +
      '(política: 30). Mitigação já embutida na recomendação: 7.000 t da compra antecipada vão a Natal (cobertura volta a 38 dias) ' +
      'e a descarga foi priorizada na janela de atracação.',
    referencias: [
      { rotulo: 'Alerta crítico', rota: '/alertas' },
      { rotulo: 'Distribuição por moinho', rota: '/compra' },
    ],
  },
  {
    id: 'resp-dolar-545',
    pergunta: 'O que acontece se o dólar for a R$ 5,45?',
    resposta:
      'R$ 5,45 está dentro da banda de 90 dias (P90: R$ 5,60). Sobre a exposição de US$ 72M do horizonte: ' +
      'sem ação, com 27% coberto, o impacto seria de ~R$ 13,1M (US$ 52,6M abertos × R$ 0,25). ' +
      'Com o hedge recomendado (cobertura a 60%), o impacto cai para ~R$ 7,2M — proteção de ~R$ 5,9M nesse cenário. ' +
      'Você pode testar esse choque no Simulador com variação de câmbio de +4,8%.',
    referencias: [
      { rotulo: 'Recomendação de Hedge', rota: '/hedge' },
      { rotulo: 'Simulador de Cenários', rota: '/simulador' },
    ],
  },
  {
    id: 'resp-blend',
    pergunta: 'Por que blend 65/35 e não 70/30?',
    resposta:
      'O blend 65% Argentina (W 280, proteína 11,5%) + 35% EUA HRW (W 320, proteína 12,5%) entrega W médio ~294 e ' +
      'proteína ~11,85% — acima da espec de massas e pães (W ≥ 290, proteína ≥ 11,8%) com folga de processo. ' +
      'Em 70/30, o W médio cai para ~292 e a proteína para ~11,8%: tecnicamente no limite, sem margem para variação de lote. ' +
      'Em 60/40, a espec sobe, mas o custo do blend aumenta ~R$ 9/t pelo TLC de R$ 1.736/t do HRW. ' +
      'O 65/35 é o menor custo que mantém margem de segurança de qualidade.',
    referencias: [{ rotulo: 'Comparativo de alternativas', rota: '/tlc' }],
  },
  {
    id: 'resp-exposicao',
    pergunta: 'Onde estou mais exposto no câmbio?',
    resposta:
      'A exposição de 90 dias é de US$ 72M, concentrada nos buckets longos: 0–30 dias US$ 24M (45% coberto), ' +
      '31–60 dias US$ 28M (24% coberto) e 61–90 dias US$ 20M (só 10% coberto). Ponderado, apenas 27% do horizonte ' +
      'está protegido — por isso a recomendação eleva a cobertura para 60% com NDF de US$ 23,5M a R$ 5,27, ' +
      'reduzindo o VaR de R$ 8,4M para R$ 3,9M. Há ainda US$ 36M no bucket 91–180 dias (8% coberto), fora da janela desta decisão.',
    referencias: [{ rotulo: 'Posição de hedge', rota: '/hedge' }],
  },
]
