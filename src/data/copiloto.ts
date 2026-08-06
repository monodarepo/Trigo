import type {
  FarinhaId,
  MensagemCopiloto,
  MoinhoId,
  PerfilSimulacao,
  PerguntaResposta,
  RespostaRicaCopiloto,
} from './types'
import { RECOMENDACAO_COMPRA } from './compra'
import { getMoinho, getOrigem } from './dominio'
import { RECOMENDACAO_HEDGE } from './hedge'
import { MV_RIO_PARANA } from './logistica'
import { PRECOS_ATUAIS } from './mercado'
import { SERIE_CAMBIO, SERIE_PRECO_TRIGO } from './previsao'
import { CENARIO_DEFAULT, PERFIS_SIMULADOR } from './simulador'
import { ALTERNATIVAS_COMPRA, TLC_BASELINE_RS, TLC_RECOMENDADO_RS } from './tlc'
import { VALOR_CAPTURADO_YTD_RS } from './vro'
import { CENARIOS_MAKE_BUY_SELL, CENARIO_MBS_ANCORA, KPIS_FARINHA } from './makeBuySell'
import {
  MARGEM_OPORTUNIDADES_RECOMENDADAS_RS,
  OPORTUNIDADES_COMERCIAIS,
  REGIOES_COMERCIAIS,
  getClienteExterno,
} from './comercial'
import { FARINHA_ANCORA, MOINHO_ANCORA, custoInternoFarinha, eficienciaMoinhos } from './economics'
import { NECESSIDADE_FARINHA_MES_T, FARINHA_DISPONIVEL_MERCADO_T } from './demanda'
import { getFarinha } from './farinha'
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

/**
 * Chips de perguntas do chat. As 4 primeiras são do elo do TRIGO; as 4 últimas
 * são as da MARGEM — a cadeia inteira em oito perguntas.
 */
export const PERGUNTAS_CHIPS: string[] = [
  'Qual a melhor estratégia de compra e hedge para os próximos 90 dias?',
  'Qual origem tem hoje o menor custo total?',
  'Devemos antecipar a compra?',
  'Qual o impacto no EBITDA?',
  'Produzir, comprar ou vender?',
  'Qual moinho é mais competitivo?',
  'Onde vender farinha rende mais?',
  'Qual o ganho da verticalização?',
]

/** Respostas do elo do TRIGO — números idênticos às outras telas. */
const RESPOSTAS_TRIGO: RespostaRicaCopiloto[] = [
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

// ---------------------------------------------------------------------------
// Elo farinha → margem: as 4 perguntas que o CPO/CFO faz depois do moinho
// ---------------------------------------------------------------------------

const rsT = (v: number) => `${formatBRL(v)}/t`
const moinhoNome = (id: MoinhoId) => getMoinho(id)?.nome ?? id
const farinhaNome = (id: FarinhaId) => getFarinha(id)?.nome ?? id

/** Ranking de eficiência na spec-âncora, só com quem REALMENTE roda a spec. */
const eficienciasAncora = eficienciaMoinhos(FARINHA_ANCORA)
const rankingMoinhos = [...eficienciasAncora]
  .filter((e) => e.rodaSpec)
  .sort((a, b) => a.custoInternoRsT - b.custoInternoRsT)
const campeao = rankingMoinhos[0]
const lanterna = rankingMoinhos[rankingMoinhos.length - 1]
/** Quem aparece na régua mas não disputa a prova — dito explicitamente. */
const simulados = eficienciasAncora.filter((e) => !e.rodaSpec)

const rotuloDecisao = (c: (typeof CENARIOS_MAKE_BUY_SELL)[number]) =>
  c.alternativas.find((a) => a.alternativa === c.recomendada)!.rotulo

const oportunidadesRanqueadas = [...OPORTUNIDADES_COMERCIAIS]
  .filter((o) => o.status !== 'recusar')
  .sort((a, b) => b.margemRsT - a.margemRsT)
  .slice(0, 5)

const regiaoRotulo = (id: string) => REGIOES_COMERCIAIS.find((r) => r.id === id)?.rotulo ?? id

const ganhoVerticalMensalRs = KPIS_FARINHA.ganhoVerticalizacaoRsT * NECESSIDADE_FARINHA_MES_T
const custoAncora = custoInternoFarinha(MOINHO_ANCORA, FARINHA_ANCORA)

/** Linha de logística interna (R$/t de farinha) de cada extremo do ranking. */
const logisticaRsT = (id: MoinhoId) =>
  custoInternoFarinha(id, FARINHA_ANCORA).componentes.find((c) => c.tipo === 'logistica')?.valorRs ?? 0
const logisticaCampeaoRsT = logisticaRsT(campeao.moinhoId)
/** O cenário do Sul, buscado por moinho — índice fixo quebraria ao reordenar. */
const cenarioSul = CENARIOS_MAKE_BUY_SELL.find((c) => c.moinhoId === 'bento-goncalves')!
const logisticaLanternaRsT = logisticaRsT(lanterna.moinhoId)

const RESPOSTAS_MARGEM: RespostaRicaCopiloto[] = [
  {
    id: 'rica-make-buy-sell',
    pergunta: PERGUNTAS_CHIPS[4],
    agentes: ['make-buy-sell', 'moinhos', 'orquestrador'],
    texto:
      'Não é uma escolha só: são DUAS decisões sobre tonelagens diferentes. Para a demanda das fábricas, comparo produzir, ' +
      'comprar de terceiros, estocar ou parar; para a capacidade ociosa, comparo vender ou deixar parada. ' +
      'Todos os resultados são medidos contra a mesma referência — comprar farinha no mercado, que vale 0 por definição:',
    tabela: {
      colunas: ['Moinho × farinha', 'Custo interno', 'Preço externo', 'Decisão', 'Valor da decisão'],
      linhas: CENARIOS_MAKE_BUY_SELL.map((c) => [
        `${moinhoNome(c.moinhoId)} × ${farinhaNome(c.farinhaId).replace('Farinha para ', '')}`,
        rsT(c.custoInternoRsT),
        rsT(c.precoExternoRsT),
        rotuloDecisao(c),
        formatBRL(c.beneficioVsAlternativaRs, { compacto: true }),
      ]),
    },
    bullets: [
      `A decisão Make/Buy se faz no custo EVITÁVEL (${rsT(CENARIO_MBS_ANCORA.custoEvitavelRsT)} em Fortaleza), não no pleno: a depreciação é afundada e continua saindo mesmo se você comprar de terceiros.`,
      `Já vender a tonelada incremental se faz no custo MARGINAL (${rsT(campeao.custoMarginalRsT)}), porque os fixos já foram absorvidos pelo volume atual — mas o custo de servir entra inteiro, senão a margem aparece inflada.`,
      'No Sul o sinal inverte: perto da origem do trigo, o mercado bate a moagem própria e COMPRAR é a resposta correta — não é um moinho ruim, é geografia.',
      `Excedente disponível para venda depois de atendida a demanda das fábricas: ${formatTon(FARINHA_DISPONIVEL_MERCADO_T)}.`,
    ],
    recomendacao: {
      titulo: `${rotuloDecisao(CENARIO_MBS_ANCORA)} — e vender o excedente`,
      texto:
        'Produzir cobre a demanda das fábricas com ganho sobre o preço de compra externa; a folga do parque vai ao mercado ' +
        'acima do custo marginal. As duas decisões cabem juntas porque a ocupação de 83,8% deixa espaço para ambas.',
      stats: [
        { label: 'Custo interno', value: rsT(CENARIO_MBS_ANCORA.custoInternoRsT), hint: 'pleno absorvido' },
        { label: 'Ganho vs comprar', value: rsT(KPIS_FARINHA.ganhoVerticalizacaoRsT) },
        { label: 'Margem da venda', value: rsT(KPIS_FARINHA.margemVendaExternaRsT), hint: 'líquida do custo de servir' },
        {
          label: 'Benefício total',
          value: `${formatBRL(KPIS_FARINHA.beneficioMakeBuySellRs, { compacto: true })}/mês`,
          hint: 'vs a 2ª melhor decisão',
        },
      ],
    },
    destaque:
      'O erro clássico é ranquear as cinco alternativas numa lista só: "vender" tem margem maior por tonelada e parece ganhar, ' +
      'mas escolher vender para a tonelada da fábrica deixa a demanda interna descoberta — e aí é preciso comprar farinha de ' +
      'terceiros para repor, ao preço cheio de mercado.',
    fontes: [
      `Custo interno por moinho × spec (motor econômico)`,
      'Preços externos apples-to-apples (industrial · granel · posto fábrica)',
      `Capacidade ociosa: ${formatTon(FARINHA_DISPONIVEL_MERCADO_T)}`,
    ],
    acoes: [
      { rotulo: 'Abrir Make/Buy/Sell', rota: '/make-buy-sell' },
      { rotulo: 'Ver performance dos moinhos', rota: '/moinhos' },
    ],
  },
  {
    id: 'rica-moinho-competitivo',
    pergunta: PERGUNTAS_CHIPS[5],
    agentes: ['moinhos', 'tlc'],
    texto:
      `${moinhoNome(campeao.moinhoId)}, com ${rsT(campeao.custoInternoRsT)} de custo pleno na farinha de massas. ` +
      `O spread até ${moinhoNome(lanterna.moinhoId)} (${rsT(lanterna.custoInternoRsT)}) é de ${rsT(lanterna.custoInternoRsT - campeao.custoInternoRsT)} — ` +
      'e quase todo ele vem da logística interna do porto até o moinho, não da eficiência da moagem:',
    tabela: {
      colunas: ['Moinho', 'Rendimento', 'Custo pleno', 'Custo marginal', 'Utilização', 'Semáforo'],
      linhas: rankingMoinhos.map((e) => [
        moinhoNome(e.moinhoId),
        formatPct(e.rendimentoPct, 1),
        rsT(e.custoInternoRsT),
        rsT(e.custoMarginalRsT),
        formatPct(e.utilizacaoPct),
        e.semaforo === 'verde' ? 'Verde' : e.semaforo === 'ambar' ? 'Âmbar' : 'Vermelho',
      ]),
    },
    bullets: [
      `Rendimento explica pouco do spread: a diferença entre o melhor e o pior é de ${formatPct(Math.abs(campeao.rendimentoPct - lanterna.rendimentoPct), 1)} de rendimento, mas de ${rsT(lanterna.custoInternoRsT - campeao.custoInternoRsT)} de custo. Rolândia, aliás, tem o MAIOR rendimento do parque e ainda assim é o 5º em custo.`,
      `O que separa é o frete interno: em ${moinhoNome(campeao.moinhoId)} ele pesa ${rsT(logisticaCampeaoRsT)} na farinha; em ${moinhoNome(lanterna.moinhoId)}, ${rsT(logisticaLanternaRsT)} — sozinho, ${formatPct(Math.round(((logisticaLanternaRsT - logisticaCampeaoRsT) / (lanterna.custoInternoRsT - campeao.custoInternoRsT)) * 100))} do spread.`,
      `${moinhoNome(lanterna.moinhoId)} está em vermelho: nenhuma utilização o torna competitivo contra o preço do Sul. A resposta lá é comprar, não moer melhor.`,
      simulados.length === 0
        ? 'Todos os moinhos da régua rodam esta spec.'
        : simulados.length === 1
          ? `${moinhoNome(simulados[0].moinhoId)} aparece na régua por comparação, mas não roda esta spec — não disputa o título.`
          : `${simulados.map((e) => moinhoNome(e.moinhoId)).join(' e ')} aparecem na régua por comparação, mas não rodam esta spec — não disputam o título.`,
    ],
    destaque:
      `Cuidado com a régua: comparar moinhos pelo custo da farinha só é justo dentro da MESMA spec. ` +
      `Uma unidade que roda farinha de biscoito (blend mais barato, rendimento menor) parece melhor ou pior que uma de massas ` +
      `por diferença de produto, não de eficiência.`,
    fontes: [
      'Rendimento e extração por unidade',
      'TLC do trigo posto em cada moinho',
      'Energia, conversão, depreciação e crédito do farelo',
    ],
    acoes: [
      { rotulo: 'Abrir Performance dos Moinhos', rota: '/moinhos' },
      { rotulo: 'Ver o TLC por moinho', rota: '/tlc' },
    ],
  },
  {
    id: 'rica-onde-vender',
    pergunta: PERGUNTAS_CHIPS[6],
    agentes: ['comercial-farinha', 'make-buy-sell'],
    texto:
      `A carteira recomendada soma ${formatBRL(MARGEM_OPORTUNIDADES_RECOMENDADAS_RS, { compacto: true })}/mês de margem. ` +
      'Mas margem por tonelada não basta: o que decide é se a venda cabe na folga ou se obriga a repor farinha comprada — ' +
      'por isso cada linha traz a barra do uso interno e o guardrail de ruptura:',
    tabela: {
      colunas: ['Cliente · região', 'Volume', 'Margem', 'Ganho se usar dentro', 'Guardrail'],
      linhas: oportunidadesRanqueadas.map((o) => [
        `${getClienteExterno(o.clienteId)?.nome ?? o.clienteId} · ${regiaoRotulo(o.regiao)}`,
        formatTon(o.volumeT),
        rsT(o.margemRsT),
        o.ganhoUsoInternoRsT != null ? rsT(o.ganhoUsoInternoRsT) : 'sem base comparável',
        o.guardrail.semaforo === 'seguro'
          ? 'Cabe na folga'
          : o.guardrail.semaforo === 'atencao'
            ? `${formatTon(o.guardrail.volumeEmRupturaT)} em reposição`
            : `${formatTon(o.guardrail.volumeEmRupturaT)} em ruptura`,
      ]),
    },
    bullets: [
      'Nordeste é onde o preço mais paga: o trigo importado sobe e os moageiros independentes repassam com 30–45 dias de defasagem.',
      'Sul é o contrário — perto da colheita do RS/PR, o mercado está abaixo do nosso custo. Lá a decisão é comprar, não vender.',
      'Uma venda só supera o uso interno quando a margem bate o ganho da verticalização daquela mesma tonelada. Quando não há cotação apples-to-apples da spec na região, não existe barra a comparar — e fingir que ela é zero faria qualquer venda parecer boa.',
    ],
    destaque:
      'Onde o guardrail acende: um pedido cuja parcela em ruptura obriga a comprar farinha de terceiros para repor a fábrica ' +
      'troca margem alta aparente por margem quase nula real. A tela mostra o volume que cabe na folga e o que só sai tirando ' +
      'da produção própria.',
    fontes: [
      'Preços por região × canal × apresentação',
      'Custo de servir e custo de reposição',
      'Capacidade ociosa por moinho',
    ],
    acoes: [
      { rotulo: 'Abrir Oportunidades Comerciais', rota: '/oportunidades' },
      { rotulo: 'Ver o mercado de farinha', rota: '/previsao' },
    ],
  },
  {
    id: 'rica-ganho-verticalizacao',
    pergunta: PERGUNTAS_CHIPS[7],
    agentes: ['verticalizacao', 'moinhos'],
    texto:
      `${rsT(KPIS_FARINHA.ganhoVerticalizacaoRsT)} de farinha — a diferença entre comprar a mesma spec no mercado ` +
      `(${rsT(KPIS_FARINHA.precoExternoEquivalenteRsT)}) e produzi-la (${rsT(KPIS_FARINHA.custoFarinhaRsT)}). ` +
      `Sobre as ${formatTon(NECESSIDADE_FARINHA_MES_T)} que as fábricas consomem por mês, são ` +
      `${formatBRL(ganhoVerticalMensalRs, { compacto: true })}/mês. A composição do custo interno:`,
    tabela: {
      colunas: ['Componente', 'R$/t de farinha'],
      // Derivada do motor: a mesma decomposição que a tela de Moinhos desenha
      // no waterfall. Digitá-la aqui deixaria as duas divergirem no primeiro
      // ajuste de TLC.
      linhas: [
        ...custoAncora.componentes.map((c) => [
          c.rotulo,
          `${c.valorRs < 0 ? '−' : ''}${formatBRL(Math.abs(c.valorRs))}`,
        ]),
        ['= Custo interno da farinha', formatBRL(custoAncora.totalRsT)],
      ],
    },
    bullets: [
      `O rendimento de ${formatPct(KPIS_FARINHA.rendimentoPct)} é o que amplifica tudo: cada tonelada de farinha exige 1,32 t de trigo, então o TLC entra dividido por 0,76 e qualquer variação no trigo chega multiplicada à farinha.`,
      `Os ${formatPct(100 - KPIS_FARINHA.rendimentoPct)} restantes viram farelo e subprodutos, que voltam como crédito de ${rsT(KPIS_FARINHA.creditoFareloRsT)} — ignorá-lo superestimaria o custo em mais de 10%.`,
      `O gap contra o mercado é de ${formatPct(KPIS_FARINHA.gapInternoMercadoPct, 1)}: é a folga que sustenta a verticalização mesmo se o preço externo cair.`,
    ],
    destaque:
      'A comparação só vale entre produtos equivalentes: mesma spec, mesma aplicação, granel, canal industrial e posto fábrica. ' +
      'Confrontar o custo interno com um "preço médio de farinha" de mercado — que embute embalagem, frete ao cliente e margem ' +
      'de canal — inventaria um ganho que não existe.',
    fontes: [
      'Motor econômico: custo interno por moinho × spec',
      'Cotação comparável de moageiros independentes',
      `Demanda das fábricas: ${formatTon(NECESSIDADE_FARINHA_MES_T)}/mês`,
    ],
    acoes: [
      { rotulo: 'Abrir Verticalização', rota: '/verticalizacao' },
      { rotulo: 'Ver o plano de demanda', rota: '/demanda' },
    ],
  },
]

/**
 * Respostas estruturadas (canned) da cadeia inteira: primeiro o trigo, depois
 * a margem — a mesma ordem da sidebar, do sinal à decisão.
 */
export const RESPOSTAS_RICAS: RespostaRicaCopiloto[] = [...RESPOSTAS_TRIGO, ...RESPOSTAS_MARGEM]

export const PERGUNTAS_SUGERIDAS: string[] = [
  'Por que antecipar 18% do trimestre agora?',
  'Como o TLC de R$ 1.480/t foi calculado?',
  'Qual o impacto do atraso do MV Río Paraná?',
  'O que acontece se o dólar for a R$ 5,45?',
  'Por que blend 65/35 e não 70/30?',
  'Onde estou mais exposto no câmbio?',
  'Por que o custo da farinha é R$ 2.100/t?',
  'Por que comprar farinha no Sul em vez de moer?',
]

/** Conversa inicial exibida ao abrir o Copiloto (resumo do dia). */
export const CONVERSA_INICIAL: MensagemCopiloto[] = [
  {
    id: 'msg-boas-vindas',
    autor: 'copiloto',
    timestamp: '2025-08-12T07:00:00',
    texto:
      'Bom dia. Resumo de hoje: recomendo antecipar 18% do volume do trimestre ' +
      `(${formatTon(RECOMENDACAO_COMPRA.volumeToneladas)} da Argentina via Pecém, TLC de ${formatBRL(TLC_RECOMENDADO_RS)}/t), ` +
      `proteger 60% da exposição cambial de 90 dias (${formatBRL(RECOMENDACAO_HEDGE.protecaoEstimadaRs, { compacto: true })} de proteção) ` +
      `e produzir para consumo próprio, vendendo ${formatTon(FARINHA_DISPONIVEL_MERCADO_T)} de excedente de farinha a ` +
      `${formatBRL(KPIS_FARINHA.margemVendaExternaRsT)}/t de margem. ` +
      `Impacto protegido combinado: R$ 4,8M, mais ${formatBRL(KPIS_FARINHA.beneficioMakeBuySellRs, { compacto: true })}/mês de margem nas decisões de destino da farinha. ` +
      `Probabilidade de alta do trigo em 15 dias: ${PRECOS_ATUAIS.probAltaTrigo15dPct}%. ` +
      `Dois pontos de atenção: o ${MV_RIO_PARANA.navio} com +${MV_RIO_PARANA.atrasoDias} dias afeta a cobertura de Natal, e no Sul o mercado de farinha está ` +
      'abaixo do nosso custo de moer — lá a resposta é comprar, não produzir.',
    referencias: [
      { rotulo: 'Recomendação de Compra', rota: '/compra' },
      { rotulo: 'Recomendação de Hedge', rota: '/hedge' },
      { rotulo: 'Make/Buy/Sell', rota: '/make-buy-sell' },
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
      { rotulo: 'Mercado de Trigo e Farinha', rota: '/previsao' },
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
    id: 'resp-custo-farinha',
    pergunta: 'Por que o custo da farinha é R$ 2.100/t?',
    resposta:
      `Porque o trigo entra dividido pelo rendimento. O TLC de ${formatBRL(TLC_RECOMENDADO_RS)}/t de TRIGO vira ` +
      `${formatBRL(custoAncora.componentes[0].valorRs)}/t de FARINHA quando dividido por ${formatPct(custoAncora.rendimentoPct)} — ` +
      'esse é o maior componente e a razão pela qual uma variação no grão chega amplificada à farinha. ' +
      'Sobre ele somam-se conversão, energia e manutenção, logística interna do porto ao moinho, perdas com custo financeiro ' +
      `do estoque em processo e depreciação; e abate-se o crédito do farelo (${formatBRL(KPIS_FARINHA.creditoFareloRsT)}/t), que são os ` +
      `${formatPct(100 - KPIS_FARINHA.rendimentoPct)} do grão que não viram farinha e voltam como receita. O líquido é ` +
      `${formatBRL(custoAncora.totalRsT)}/t no par-âncora Fortaleza × massas. Sem a depreciação, o custo evitável é ` +
      `${formatBRL(CENARIO_MBS_ANCORA.custoEvitavelRsT)}/t — é nessa base, e não no pleno, que se decide comprar ou moer.`,
    referencias: [
      { rotulo: 'Performance dos Moinhos', rota: '/moinhos' },
      { rotulo: 'Verticalização', rota: '/verticalizacao' },
    ],
  },
  {
    id: 'resp-comprar-sul',
    pergunta: 'Por que comprar farinha no Sul em vez de moer?',
    resposta:
      'Porque lá o mercado bate a nossa moagem — e não por ineficiência do moinho. Bento Gonçalves fica longe do porto: ' +
      `o frete interno pesa ${formatBRL(logisticaLanternaRsT)}/t na farinha, contra ${formatBRL(logisticaCampeaoRsT)}/t em ` +
      `${moinhoNome(campeao.moinhoId)}. Com isso o custo evitável chega a ${formatBRL(cenarioSul.custoEvitavelRsT)}/t, ` +
      `enquanto moageiros do RS/PR — colados na origem do trigo, em plena colheita — entregam a mesma spec a ` +
      `${formatBRL(cenarioSul.precoExternoRsT)}/t. Comprar economiza ` +
      `${formatBRL(cenarioSul.custoEvitavelRsT - cenarioSul.precoExternoRsT)}/t. ` +
      'A conta se faz no custo EVITÁVEL, não no pleno: a depreciação é afundada e continua saindo mesmo com o moinho parado, ' +
      'então incluí-la exageraria a vantagem de comprar. A capacidade liberada vai para outra spec — não é parar a moagem.',
    referencias: [
      { rotulo: 'Simulador Make/Buy/Sell', rota: '/make-buy-sell' },
      { rotulo: 'Performance dos Moinhos', rota: '/moinhos' },
    ],
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
