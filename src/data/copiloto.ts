import type {
  MensagemCopiloto,
  PerfilSimulacao,
  PerguntaResposta,
  RespostaRicaCopiloto,
} from './types'
import { RECOMENDACAO_COMPRA } from './compra'
import { getOrigem } from './dominio'
import { RECOMENDACAO_HEDGE } from './hedge'
import { MV_RIO_PARANA } from './logistica'
import { PRECOS_ATUAIS } from './mercado'
import { SERIE_CAMBIO, SERIE_PRECO_TRIGO } from './previsao'
import { CENARIO_DEFAULT, PERFIS_SIMULADOR } from './simulador'
import { ALTERNATIVAS_COMPRA, TLC_BASELINE_RS, TLC_RECOMENDADO_RS } from './tlc'
import { VALOR_CAPTURADO_YTD_RS } from './vro'
import { formatBRL, formatPct, formatTon, formatUSD } from './format'

const fmtDelta = (v: number) => `${v < 0 ? '−' : '+'}${formatBRL(Math.abs(v), { compacto: true })}`
const fmtPp = (v: number) =>
  `${v < 0 ? '−' : '+'}${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.p.`

/** Linha da mini-tabela de cenários — derivada do cenário-base do simulador. */
function linhaPerfil(perfil: PerfilSimulacao): string[] {
  const cfg = PERFIS_SIMULADOR[perfil]
  const out = CENARIO_DEFAULT.porPerfil[perfil]
  return [
    cfg.rotulo,
    `${formatTon(out.volumeAntecipadoT)} (${formatPct(cfg.anteciparPct)})`,
    formatPct(cfg.hedgePct),
    fmtDelta(out.deltaVsBaselineRs),
    `${fmtDelta(-out.deltaVsBaselineRs)} · ${fmtPp(out.impactoMargemEbitdaPp)}`,
  ]
}

/** Chips de perguntas do chat (as 4 principais da demo). */
export const PERGUNTAS_CHIPS: string[] = [
  'Qual a melhor estratégia de compra e hedge para os próximos 90 dias?',
  'Qual origem tem hoje o menor custo total?',
  'Devemos antecipar a compra?',
  'Qual o impacto no EBITDA?',
]

/** Respostas estruturadas (canned) — números idênticos às outras telas. */
export const RESPOSTAS_RICAS: RespostaRicaCopiloto[] = [
  {
    id: 'rica-estrategia-90d',
    pergunta: PERGUNTAS_CHIPS[0],
    texto:
      `Com ${formatPct(PRECOS_ATUAIS.probAltaTrigo15dPct)} de probabilidade de alta em 15 dias, CBOT projetado a ` +
      `US$ ${SERIE_PRECO_TRIGO.horizontes.d30.valor}/t em 30 dias e câmbio a R$ 5,35 em 90, comparei os três perfis ` +
      'no cenário-base do simulador:',
    tabela: {
      colunas: ['Cenário', 'Antecipação', 'Hedge', 'Δ CPV', 'EBITDA'],
      linhas: (['conservador', 'recomendado', 'oportunistico'] as PerfilSimulacao[]).map(linhaPerfil),
    },
    bullets: [
      'Safra argentina revisada para baixo (fator de maior peso: +30%) e seca no Mar Negro (+22%) sustentam o viés de alta.',
      `Janela de frete Up River de ${RECOMENDACAO_COMPRA.janelaDias} dias antes da disputa com o milho.`,
      `NDF de 90 dias a R$ ${RECOMENDACAO_HEDGE.taxaForwardMedia.toFixed(2).replace('.', ',')} ainda com desconto vs cenário-base de R$ 5,35.`,
      'O oportunístico rende mais se a alta se confirmar, mas deixa US$ 46,8M de câmbio aberto — fora do apetite de risco da política.',
    ],
    recomendacao: {
      titulo: 'Antecipar 18% do trimestre + proteger 60% do câmbio',
      texto:
        'Melhor equilíbrio custo × risco: trava o TLC de R$ 1.480/t na janela e reduz o VaR cambial de R$ 8,4M para R$ 3,9M.',
      stats: [
        { label: 'Volume', value: formatTon(RECOMENDACAO_COMPRA.volumeToneladas), hint: `janela de ${RECOMENDACAO_COMPRA.janelaDias} dias` },
        { label: 'TLC', value: `${formatBRL(TLC_RECOMENDADO_RS)}/t`, hint: `vs ${formatBRL(TLC_BASELINE_RS)}/t baseline` },
        { label: 'Hedge', value: formatUSD(RECOMENDACAO_HEDGE.notionalNovoUsd, { compacto: true }), hint: RECOMENDACAO_HEDGE.instrumento },
        { label: 'Impacto protegido', value: 'R$ 4,8M', hint: 'compra + hedge' },
      ],
    },
    fontes: [
      `Previsão: prob. ${formatPct(PRECOS_ATUAIS.probAltaTrigo15dPct)} · CBOT d30 US$ ${SERIE_PRECO_TRIGO.horizontes.d30.valor}`,
      `TLC Argentina ${formatBRL(TLC_RECOMENDADO_RS)}/t`,
      `Exposição 90d ${formatUSD(RECOMENDACAO_HEDGE.exposicaoUsd, { compacto: true })}`,
      'Simulador — cenário-base',
    ],
    acoes: [
      { rotulo: 'Levar ao Simulador', rota: '/simulador' },
      { rotulo: 'Abrir Recomendação', rota: '/compra' },
    ],
  },
  {
    id: 'rica-menor-custo',
    pergunta: PERGUNTAS_CHIPS[1],
    texto:
      `O menor custo nominal é o trigo doméstico do RS (${formatBRL(1425)}/t), mas o W 190 não atende massas e pães. ` +
      `Entre as origens que atendem a especificação, a Argentina via Pecém lidera com ${formatBRL(TLC_RECOMENDADO_RS)}/t:`,
    tabela: {
      colunas: ['Origem', 'FOB (US$/t)', 'TLC (R$/t)', 'Espec'],
      linhas: ALTERNATIVAS_COMPRA.map((a) => [
        getOrigem(a.origemId)?.nome ?? a.origemId,
        a.fobUsd != null ? `US$ ${a.fobUsd}` : '—',
        formatBRL(a.tlcRs),
        a.atendeEspec ? 'Atende' : 'Não atende',
      ]),
    },
    destaque:
      'Menor FOB ≠ menor landed: a Rússia tem o menor FOB importado (US$ 231/t) e fecha a R$ 1.581/t — R$ 101/t acima da Argentina — por imposto extra-Mercosul, frete e risco de qualidade.',
    fontes: ['Comparador de alternativas (TLC)', 'Qualidade: W · proteína · DON', 'Câmbio R$ 5,20'],
    acoes: [
      { rotulo: 'Ver decomposição do TLC', rota: '/tlc' },
      { rotulo: 'Abrir Recomendação', rota: '/compra' },
    ],
  },
  {
    id: 'rica-antecipar',
    pergunta: PERGUNTAS_CHIPS[2],
    texto: `Sim — com confiança de ${formatPct(RECOMENDACAO_COMPRA.confiancaPct)}. Três razões se combinam hoje:`,
    bullets: [
      `Preço: ${formatPct(PRECOS_ATUAIS.probAltaTrigo15dPct)} de probabilidade de alta em 15 dias; comprar agora trava ${formatBRL(TLC_RECOMENDADO_RS)}/t vs ${formatBRL(TLC_BASELINE_RS)}/t do baseline (${formatBRL(RECOMENDACAO_COMPRA.economiaTotalRs, { compacto: true })} no lote).`,
      `Logística: janela de frete de ${RECOMENDACAO_COMPRA.janelaDias} dias e fila curta em Pecém; o ${MV_RIO_PARANA.navio} (+${MV_RIO_PARANA.atrasoDias} dias) já pressiona Natal.`,
      'Estoque: Fortaleza com 21 dias e Natal com 19 — abaixo da política de 30; a compra recompõe ambos (39 e 38 dias).',
    ],
    recomendacao: {
      titulo: `Comprar ${formatTon(RECOMENDACAO_COMPRA.volumeToneladas)} — Argentina via Pecém`,
      texto: 'Blend 65% Argentina + 35% EUA (HRW) mantém W ≥ 290 e proteína ≥ 11,8% para massas e pães.',
      stats: [
        { label: 'Economia', value: `${formatBRL(RECOMENDACAO_COMPRA.economiaRsT)}/t`, hint: `${formatBRL(RECOMENDACAO_COMPRA.economiaTotalRs, { compacto: true })} no lote` },
        { label: 'Confiança', value: formatPct(RECOMENDACAO_COMPRA.confiancaPct) },
        { label: 'Janela', value: `${RECOMENDACAO_COMPRA.janelaDias} dias` },
        { label: 'Blend', value: '65/35' },
      ],
    },
    fontes: ['Recomendação de Compra', 'Estoques por moinho', 'Previsão de preço'],
    acoes: [
      { rotulo: 'Abrir Recomendação', rota: '/compra' },
      { rotulo: 'Levar ao Simulador', rota: '/simulador' },
    ],
  },
  {
    id: 'rica-ebitda',
    pergunta: PERGUNTAS_CHIPS[3],
    texto:
      'No cenário-base (trigo +5%, câmbio +1,5%, +6 dias de atraso), a pressão de custo no trimestre depende do perfil de decisão:',
    bullets: (['conservador', 'recomendado', 'oportunistico'] as PerfilSimulacao[]).map((perfil) => {
      const out = CENARIO_DEFAULT.porPerfil[perfil]
      return `${PERFIS_SIMULADOR[perfil].rotulo}: EBITDA ${fmtDelta(-out.deltaVsBaselineRs)} (${fmtPp(out.impactoMargemEbitdaPp)}) · exposição residual ${formatUSD(out.exposicaoResidualUsd, { compacto: true })}.`
    }),
    destaque:
      `A recomendação do dia protege R$ 4,8M vs não agir (R$ 1,3M da compra + R$ 3,5M do hedge). No ano, as decisões do hub já capturaram ${formatBRL(VALOR_CAPTURADO_YTD_RS, { compacto: true })} (VRO). Lembrete de escala: ±10% no trigo ≈ ±R$ 145M de CPV.`,
    fontes: ['Simulador — 3 perfis', 'VRO acumulado 2025', `Câmbio proj. 90d R$ ${SERIE_CAMBIO.horizontes.d90.valor.toFixed(2).replace('.', ',')}`],
    acoes: [
      { rotulo: 'Levar ao Simulador', rota: '/simulador' },
      { rotulo: 'Ver VRO no Cockpit', rota: '/' },
    ],
  },
]

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
