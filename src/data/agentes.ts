/**
 * Os 10 agentes do hub — um por PERGUNTA da cadeia, não por fonte de dado.
 *
 * A ordem aqui é a ordem em que o valor se forma: sinal → trigo → farinha →
 * margem → governança. Cada agente publica UM número-síntese (`saidaAtual`),
 * e esse número é sempre lido do mesmo motor que a tela usa — nada é digitado
 * neste arquivo. É o que sustenta a tese: o alerta, o copiloto, o VRO e a tela
 * citam o mesmo agente e veem o mesmo valor.
 *
 * O orquestrador não calcula: ele resolve conflito entre agentes e assina a
 * recomendação consolidada do dia.
 */
import type { Agente, AgenteId } from './types'
import { CENARIO_MBS_ANCORA, KPIS_FARINHA } from './makeBuySell'
import {
  MARGEM_OPORTUNIDADES_RECOMENDADAS_RS,
  OPORTUNIDADES_COMERCIAIS,
  getClienteExterno,
} from './comercial'
import { RECOMENDACAO_COMPRA } from './compra'
import { FARINHA_ANCORA, eficienciaMoinhos } from './economics'
import { otimizarBlend } from './estoqueTrigo'
import { PRECOS_ATUAIS } from './mercado'
import { getMoinho } from './dominio'
import { TLC_BASELINE_RS, TLC_RECOMENDADO_RS } from './tlc'
import { formatBRL, formatPct, formatTon } from './format'

/**
 * Só entram na disputa de "mais competitivo" os moinhos que REALMENTE rodam a
 * spec: coroar quem não produz o item seria eleger campeão numa prova que ele
 * não disputa (ver a nota de `rodaSpec` em EficienciaMoinho).
 */
const eficiencias = eficienciaMoinhos(FARINHA_ANCORA)
const maisCompetitivo = [...eficiencias]
  .filter((e) => e.rodaSpec)
  .sort((a, b) => a.custoInternoRsT - b.custoInternoRsT)[0]
const emRisco = eficiencias.filter((e) => e.semaforo !== 'verde').length

/** Blend recomendado do dia para a farinha-âncora — mesma chamada da tela de Estoques. */
const blendMassa = otimizarBlend(FARINHA_ANCORA, 12_000)

const melhorOportunidade = [...OPORTUNIDADES_COMERCIAIS]
  .filter((o) => o.status === 'recomendada')
  .sort((a, b) => b.margemRsT - a.margemRsT)[0]

const recomendadaAncora = CENARIO_MBS_ANCORA.alternativas.find(
  (a) => a.alternativa === CENARIO_MBS_ANCORA.recomendada,
)!

export const AGENTES: Agente[] = [
  {
    id: 'mercado',
    nome: 'Agente de Mercado',
    elo: 'sinal',
    pergunta: 'Para onde vão trigo, câmbio, frete e farinha?',
    entrega: 'Projetar preço com banda de confiança e atribuir peso a cada fator',
    rotas: ['/previsao', '/sinais'],
    fontes: ['CBOT · FOB por origem', 'Câmbio (Frankfurter/BCE)', 'Clima nas origens (Open-Meteo)', 'Notícias (GDELT)'],
    saidaAtual: `Prob. de alta em 15 dias: ${formatPct(PRECOS_ATUAIS.probAltaTrigo15dPct)}`,
  },
  {
    id: 'originacao',
    nome: 'Agente de Originação',
    elo: 'trigo',
    pergunta: 'De qual origem, com qual fornecedor e por qual porto?',
    entrega: 'Ranquear origem × fornecedor × porto por disponibilidade, qualidade e risco',
    rotas: ['/compra', '/tlc'],
    fontes: ['Ofertas de fornecedores', 'Fila e capacidade portuária', 'Laudos de pré-embarque (DON, proteína, W)'],
    saidaAtual: `Argentina · Pecém · ${formatTon(RECOMENDACAO_COMPRA.volumeToneladas)}`,
  },
  {
    id: 'tlc',
    nome: 'Agente de TLC',
    elo: 'trigo',
    pergunta: 'Quanto custa de verdade o trigo posto no moinho?',
    entrega: 'Somar os 12 componentes do custo total landed e precificar o risco dentro dele',
    rotas: ['/tlc', '/compra'],
    fontes: ['FOB + prêmio de origem', 'Frete marítimo · AFRMM · seguro', 'Despesas portuárias · demurrage', 'Transporte interno por moinho'],
    saidaAtual: `${formatBRL(TLC_RECOMENDADO_RS)}/t vs ${formatBRL(TLC_BASELINE_RS)}/t baseline`,
  },
  {
    id: 'moinhos',
    nome: 'Agente de Performance dos Moinhos',
    elo: 'farinha',
    pergunta: 'Qual moinho produz a farinha mais barata — e a que custo marginal?',
    entrega: 'Apurar custo pleno, evitável e marginal por moinho × spec e vigiar a capacidade econômica mínima',
    rotas: ['/moinhos'],
    fontes: ['Rendimento e extração por moinho', 'Energia, conversão e depreciação', 'Crédito do farelo', 'TLC do trigo no moinho'],
    saidaAtual: `${getMoinho(maisCompetitivo.moinhoId)?.nome} lidera a ${formatBRL(maisCompetitivo.custoInternoRsT)}/t · ${emRisco} moinho(s) em atenção ou pior`,
  },
  {
    id: 'blend',
    nome: 'Agente de Blend',
    elo: 'farinha',
    pergunta: 'Qual mistura de lotes atende a espec ao menor custo?',
    entrega: 'Otimizar o blend dentro das faixas de proteína, W, falling number, umidade e DON',
    rotas: ['/estoques', '/compra'],
    fontes: ['Lotes em silo com laudo de qualidade', 'Faixas de espec por farinha', 'TLC de cada lote'],
    saidaAtual: blendMassa.atendeSpec
      ? `Massas: ${formatBRL(blendMassa.custoRsT)}/t com ${blendMassa.partes.length} lote(s)`
      : 'Sem combinação viável na espec de massas',
  },
  {
    id: 'verticalizacao',
    nome: 'Agente de Verticalização',
    elo: 'margem',
    pergunta: 'Quanto vale abastecer a própria fábrica em vez de comprar farinha?',
    entrega: 'Medir o ganho por tonelada destinada às fábricas próprias contra o preço equivalente de mercado',
    rotas: ['/verticalizacao', '/demanda'],
    fontes: ['Custo interno por moinho × spec', 'Preço externo comparável (apples-to-apples)', 'Demanda das fábricas'],
    saidaAtual: `${formatBRL(KPIS_FARINHA.ganhoVerticalizacaoRsT)}/t de ganho (gap de ${formatPct(KPIS_FARINHA.gapInternoMercadoPct, 1)})`,
  },
  {
    id: 'make-buy-sell',
    nome: 'Agente de Make/Buy/Sell',
    elo: 'margem',
    pergunta: 'Produzir, comprar ou vender — por moinho e por spec?',
    entrega: 'Escolher o destino de cada tonelada: demanda das fábricas numa decisão, capacidade ociosa noutra',
    rotas: ['/make-buy-sell', '/simulador'],
    fontes: ['Custo evitável e marginal', 'Preço externo comparável', 'Capacidade ociosa por moinho', 'Custo de servir'],
    saidaAtual: `${recomendadaAncora.rotulo} · benefício ${formatBRL(KPIS_FARINHA.beneficioMakeBuySellRs, { compacto: true })}/mês`,
  },
  {
    id: 'comercial-farinha',
    nome: 'Agente Comercial de Farinha',
    elo: 'margem',
    pergunta: 'Onde vender farinha rende mais que usá-la dentro de casa?',
    entrega: 'Ranquear região × cliente × canal por margem líquida e barrar a venda que provoca ruptura interna',
    rotas: ['/oportunidades'],
    fontes: ['Preços por região, canal e apresentação', 'Custo de servir e frete', 'Capacidade disponível', 'Custo de reposição'],
    saidaAtual: melhorOportunidade
      ? `${getClienteExterno(melhorOportunidade.clienteId)?.nome}: ${formatBRL(melhorOportunidade.margemRsT)}/t · carteira ${formatBRL(MARGEM_OPORTUNIDADES_RECOMENDADAS_RS, { compacto: true })}/mês`
      : `Carteira recomendada: ${formatBRL(MARGEM_OPORTUNIDADES_RECOMENDADAS_RS, { compacto: true })}/mês`,
  },
  {
    id: 'alertas-financeiros',
    nome: 'Agente de Alertas Financeiros',
    elo: 'governanca',
    pergunta: 'O que mudou desde ontem e custa dinheiro hoje?',
    entrega: 'Converter cada desvio em impacto em R$ e apontar a tela onde a decisão acontece',
    rotas: ['/alertas', '/'],
    fontes: ['Limites de política (câmbio, estoque, orçamento)', 'Motor econômico da farinha', 'Portfólio comercial'],
    saidaAtual: 'Alertas do dia com impacto financeiro atribuído',
  },
  {
    id: 'orquestrador',
    nome: 'Orquestrador',
    elo: 'governanca',
    pergunta: 'Qual é a recomendação única, com os conflitos já resolvidos?',
    entrega: 'Arbitrar entre os agentes e assinar a recomendação consolidada do dia',
    rotas: ['/', '/copiloto', '/vro'],
    fontes: ['Saída dos 9 agentes', 'Política de risco e alçadas', 'Trilha do VRO'],
    saidaAtual: 'Compra + hedge + Make/Buy/Sell numa decisão só',
  },
]

const PORID = new Map(AGENTES.map((a) => [a.id, a]))

export function getAgente(id: AgenteId): Agente | undefined {
  return PORID.get(id)
}

/** Nome curto para selos e chips (sem o prefixo "Agente de/Agente"). */
export function nomeCurtoAgente(id: AgenteId): string {
  const a = PORID.get(id)
  if (!a) return id
  return a.nome.replace(/^Agente (de |Comercial )?/, '').replace(/^de /, '')
}

/**
 * O conflito que o orquestrador resolve hoje — explicitá-lo é o que impede a
 * leitura ingênua de que os 10 agentes concordam por acaso. O de Compra quer
 * travar volume na janela; o de Make/Buy/Sell quer capacidade livre para a
 * venda externa; a arbitragem é feita pelo mesmo critério de margem da cadeia.
 */
export const CONFLITO_ORQUESTRADO = {
  entre: ['originacao', 'make-buy-sell'] as AgenteId[],
  tensao:
    'Originação quer travar 32.000 t na janela de 5 dias; Make/Buy/Sell quer capacidade livre para vender o excedente de farinha.',
  arbitragem:
    'Os dois são atendidos: o volume antecipado cabe na folga do parque (ocupação de 83,8%), então travar o trigo não consome a capacidade que sustenta a venda externa. Se a ocupação passasse de 95%, a compra teria de ceder — o critério é a margem da cadeia, não o preço do trigo.',
} as const

/** Moinho citado pelo agente de Performance como o mais competitivo hoje. */
export const MOINHO_MAIS_COMPETITIVO = {
  id: maisCompetitivo.moinhoId,
  nome: getMoinho(maisCompetitivo.moinhoId)?.nome ?? maisCompetitivo.moinhoId,
  custoInternoRsT: maisCompetitivo.custoInternoRsT,
  custoMarginalRsT: maisCompetitivo.custoMarginalRsT,
  margemIncrementalRsT: maisCompetitivo.margemIncrementalRsT,
}
