/**
 * Agregador da "verdade única" da demo: todas as telas leem deste snapshot.
 * Nenhum componente deve inventar número — tudo nasce em src/data.
 */
import type { KpiExposicao, RecomendacaoDoDia } from './types'
import { ALERTAS, CONTAGEM_ALERTAS_SINO } from './alertas'
import {
  COBERTURA_MEDIA_DIAS,
  ESTOQUE_MOINHOS,
  RECOMENDACAO_COMPRA,
  VOLUME_TRIMESTRE_T,
} from './compra'
import {
  CONVERSA_INICIAL,
  PERGUNTAS_CHIPS,
  PERGUNTAS_SUGERIDAS,
  RESPOSTAS_MOCK,
  RESPOSTAS_RICAS,
} from './copiloto'
import { FINANCEIRO, FORNECEDORES, MOINHOS, ORIGENS, PORTOS } from './dominio'
import {
  BANDA_ORCAMENTO_PCT,
  CAMBIO_ORCADO,
  COBERTURA_ATUAL_90D_PCT,
  EXPOSICAO_90D_USD,
  POLITICA_CAMBIO_LIMITE,
  POSICOES_HEDGE,
  RECOMENDACAO_HEDGE,
} from './hedge'
import { CONTRATOS, EMBARQUES, MV_RIO_PARANA } from './logistica'
import { CLIMA_CENARIO, CLIMA_REGIOES_CENARIO, NOTICIAS_CENARIO, PRECOS_ATUAIS, SINAIS_MERCADO } from './mercado'
import { PREVISOES_ORIGEM, SERIE_CAMBIO, SERIE_PRECO_TRIGO } from './previsao'
import {
  CENARIO_DEFAULT,
  PERFIS_SIMULADOR,
  SIMULADOR_DEFAULTS,
  simularCenario,
} from './simulador'
import {
  ALTERNATIVAS_COMPRA,
  COMPONENTES_TLC_RECOMENDADO,
  RESULTADO_TLC_RECOMENDADO,
  SELECAO_TLC_DEFAULT,
  TLC_BASELINE_RS,
  TLC_RECOMENDADO_RS,
  calcularTlcMock,
} from './tlc'
import {
  ALAVANCAS_VRO,
  CURVA_VRO,
  METRICAS_VRO,
  RECOMENDACOES_VRO,
  REGISTROS_VRO,
  VALOR_CAPTURADO_YTD_RS,
} from './vro'
import { FONTES, FONTES_LISTA, REGRAS_QUALIDADE_DADOS, RESUMO_QUALIDADE_DADOS } from './sources'

/** KPIs do topo do Cockpit Executivo. */
export const KPIS_COCKPIT: KpiExposicao = {
  exposicaoCambial90dUsd: EXPOSICAO_90D_USD,
  cambioAtual: PRECOS_ATUAIS.cambioBrlUsd,
  protegidoPct: COBERTURA_ATUAL_90D_PCT,
  protegidoAlvoPct: RECOMENDACAO_HEDGE.coberturaAlvoPct,
  coberturaMediaDias: COBERTURA_MEDIA_DIAS,
  ebitdaYtdRs: FINANCEIRO.ebitdaYtdRs,
  margemEbitdaPct: FINANCEIRO.margemEbitdaPct,
}

/**
 * A recomendação do dia — IDÊNTICA no Cockpit, na Compra e no Hedge.
 * Impacto protegido: R$ 1,28M (compra antecipada) + R$ 3,52M (hedge) = R$ 4,8M.
 */
export const RECOMENDACAO_DO_DIA: RecomendacaoDoDia = {
  resumo:
    'Antecipar 18% do volume do trimestre (32.000 t · Argentina · Pecém) e proteger 60% da exposição cambial de 90 dias.',
  probAlta15dPct: PRECOS_ATUAIS.probAltaTrigo15dPct,
  impactoProtegidoRs: RECOMENDACAO_COMPRA.economiaTotalRs + RECOMENDACAO_HEDGE.protecaoEstimadaRs,
  memoriaCalculo: {
    compraAntecipadaRs: RECOMENDACAO_COMPRA.economiaTotalRs,
    hedgeCambialRs: RECOMENDACAO_HEDGE.protecaoEstimadaRs,
  },
  compra: RECOMENDACAO_COMPRA,
  hedge: RECOMENDACAO_HEDGE,
}

export const snapshot = {
  /** Instante do cenário-âncora. */
  agora: '2025-08-12T07:00:00',
  kpis: KPIS_COCKPIT,
  recomendacaoDoDia: RECOMENDACAO_DO_DIA,
  dominio: {
    financeiro: FINANCEIRO,
    origens: ORIGENS,
    fornecedores: FORNECEDORES,
    portos: PORTOS,
    moinhos: MOINHOS,
  },
  mercado: {
    precos: PRECOS_ATUAIS,
    sinais: SINAIS_MERCADO,
    clima: CLIMA_CENARIO,
    climaRegioes: CLIMA_REGIOES_CENARIO,
    noticias: NOTICIAS_CENARIO,
  },
  previsao: { precoTrigo: SERIE_PRECO_TRIGO, cambio: SERIE_CAMBIO, porOrigem: PREVISOES_ORIGEM },
  tlc: {
    baselineRs: TLC_BASELINE_RS,
    recomendadoRs: TLC_RECOMENDADO_RS,
    componentes: COMPONENTES_TLC_RECOMENDADO,
    alternativas: ALTERNATIVAS_COMPRA,
    selecaoDefault: SELECAO_TLC_DEFAULT,
    resultadoRecomendado: RESULTADO_TLC_RECOMENDADO,
    calcular: calcularTlcMock,
  },
  compra: {
    recomendacao: RECOMENDACAO_COMPRA,
    volumeTrimestreToneladas: VOLUME_TRIMESTRE_T,
    estoqueMoinhos: ESTOQUE_MOINHOS,
  },
  hedge: {
    posicoes: POSICOES_HEDGE,
    recomendacao: RECOMENDACAO_HEDGE,
    politicaCambioLimite: POLITICA_CAMBIO_LIMITE,
    cambioOrcado: CAMBIO_ORCADO,
    bandaOrcamentoPct: BANDA_ORCAMENTO_PCT,
  },
  simulador: {
    defaults: SIMULADOR_DEFAULTS,
    perfis: PERFIS_SIMULADOR,
    cenarioDefault: CENARIO_DEFAULT,
    simular: simularCenario,
  },
  logistica: { contratos: CONTRATOS, embarques: EMBARQUES, navioAtrasado: MV_RIO_PARANA },
  alertas: ALERTAS,
  /** Contagem exibida no sino da Topbar (críticos + altos). */
  contagemAlertas: CONTAGEM_ALERTAS_SINO,
  copiloto: {
    perguntasSugeridas: PERGUNTAS_SUGERIDAS,
    chips: PERGUNTAS_CHIPS,
    conversaInicial: CONVERSA_INICIAL,
    respostas: RESPOSTAS_MOCK,
    respostasRicas: RESPOSTAS_RICAS,
  },
  vro: {
    registros: REGISTROS_VRO,
    valorCapturadoYtdRs: VALOR_CAPTURADO_YTD_RS,
    recomendacoes: RECOMENDACOES_VRO,
    metricas: METRICAS_VRO,
    alavancas: ALAVANCAS_VRO,
    curva: CURVA_VRO,
  },
  /** Proveniência e qualidade de dados — a governança que a TI cobra. */
  governancaDados: {
    fontes: FONTES,
    fontesLista: FONTES_LISTA,
    regras: REGRAS_QUALIDADE_DADOS,
    resumoQualidade: RESUMO_QUALIDADE_DADOS,
  },
}

export type Snapshot = typeof snapshot

export * from './types'
export * from './format'
export { FONTES, FONTES_LISTA, FONTE_FRANKFURTER, FONTE_OPEN_METEO, FONTE_GDELT, fonteDe } from './sources'
