/**
 * Agregador da "verdade única" da demo: todas as telas leem deste snapshot.
 * Nenhum componente deve inventar número — tudo nasce em src/data.
 */
import type { KpiExposicao, RecomendacaoDoDia } from './types'
import { AGENTES, CONFLITO_ORQUESTRADO, MOINHO_MAIS_COMPETITIVO, getAgente } from './agentes'
import {
  ALERTAS,
  CONTAGEM_ALERTAS_SINO,
  IMPACTO_ALERTAS_RS,
  OPORTUNIDADE_ALERTAS_RS,
  RISCO_ALERTAS_RS,
} from './alertas'
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
import { ECONOMIA_MOAGEM, FINANCEIRO, FORNECEDORES, MOINHOS, ORIGENS, PORTOS } from './dominio'
import { FARINHAS, PRECOS_FARINHA_EXTERNOS, precoExternoComparavel } from './farinha'
import {
  CONCORRENTES_FARINHA,
  COTACOES_NAO_COMPARAVEIS,
  MESES_SERIE_FARINHA,
  NOTA_MARGEM_REFERENCIA,
  SERIES_FARINHA_MERCADO,
  TENDENCIA_FARINHA_CONSOLIDADA,
  oportunidadesRegionais,
} from './mercadoFarinha'
import {
  capacidadeFarinhaT,
  capacidadeOciosaFarinhaT,
  custoInternoFarinha,
  decisaoMakeBuySell,
  eficienciaMoinho,
  eficienciaMoinhos,
  ganhoVerticalizacao,
  margemVendaExterna,
  resumoParqueMoageiro,
} from './economics'
import {
  CALENDARIO_DEMANDA,
  DEMANDA_FARINHA,
  FARINHA_DISPONIVEL_MERCADO_T,
  NECESSIDADE_FARINHA_MES_T,
  NECESSIDADE_TRIGO_ANO_T,
  NECESSIDADE_TRIGO_MES_T,
  planoPorMoinho,
} from './demanda'
import { LOTES_TRIGO } from './estoqueTrigo'
import {
  CLIENTES_EXTERNOS,
  MARGEM_OPORTUNIDADES_RECOMENDADAS_RS,
  OPORTUNIDADES_COMERCIAIS,
  VOLUME_OPORTUNIDADES_RECOMENDADAS_T,
} from './comercial'
import {
  BENEFICIO_MAKE_BUY_SELL_RS,
  CAPACIDADE_OCIOSA_TOTAL_T,
  CENARIOS_MAKE_BUY_SELL,
  CENARIO_MBS_ANCORA,
  KPIS_FARINHA,
} from './makeBuySell'
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
  MARGEM_CAPTURADA_YTD_RS,
  MARGEM_POR_DECISAO_VRO,
  METRICAS_VRO,
  RECOMENDACOES_VRO,
  REGISTROS_VRO,
  VALOR_CAPTURADO_YTD_RS,
} from './vro'
import { FONTES, FONTES_LISTA, REGRAS_QUALIDADE_DADOS, RESUMO_QUALIDADE_DADOS } from './sources'

/** KPIs do topo da Visão Executiva. */
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
 * O excedente de farinha que a decisão do dia manda ao mercado: a folga do
 * parque depois de atendida a demanda das fábricas. Sai do plano de demanda —
 * o MESMO número que a tela de Demanda e o Make/Buy/Sell usam como capacidade
 * ociosa, para que "vender o excedente" signifique a mesma coisa nas três.
 */
const EXCEDENTE_FARINHA_T = FARINHA_DISPONIVEL_MERCADO_T

/**
 * A recomendação do dia — IDÊNTICA no Cockpit, na Compra e no Hedge, agora com
 * a terceira perna: o destino da farinha.
 * Impacto protegido: R$ 1,28M (compra antecipada) + R$ 3,52M (hedge) = R$ 4,8M.
 * A margem do Make/Buy/Sell anda em campo próprio (é R$/mês, não evento).
 */
export const RECOMENDACAO_DO_DIA: RecomendacaoDoDia = {
  resumo:
    'Antecipar 18% do volume do trimestre (32.000 t · Argentina · Pecém), proteger 60% da exposição cambial de 90 dias e ' +
    `produzir para consumo próprio, vendendo ${Math.round(EXCEDENTE_FARINHA_T).toLocaleString('pt-BR')} t de excedente de farinha.`,
  probAlta15dPct: PRECOS_ATUAIS.probAltaTrigo15dPct,
  impactoProtegidoRs: RECOMENDACAO_COMPRA.economiaTotalRs + RECOMENDACAO_HEDGE.protecaoEstimadaRs,
  memoriaCalculo: {
    compraAntecipadaRs: RECOMENDACAO_COMPRA.economiaTotalRs,
    hedgeCambialRs: RECOMENDACAO_HEDGE.protecaoEstimadaRs,
  },
  compra: RECOMENDACAO_COMPRA,
  hedge: RECOMENDACAO_HEDGE,
  makeBuySell: {
    resumo: `Produzir e consumir nas fábricas; vender ${Math.round(EXCEDENTE_FARINHA_T).toLocaleString('pt-BR')} t de excedente a ${KPIS_FARINHA.margemVendaExternaRsT.toLocaleString('pt-BR')} R$/t de margem`,
    beneficioRs: BENEFICIO_MAKE_BUY_SELL_RS,
    excedenteVendidoT: EXCEDENTE_FARINHA_T,
    margemVendaRsT: KPIS_FARINHA.margemVendaExternaRsT,
  },
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
  /** O que está em jogo nos alertas mensais com ação pendente (R$/mês). */
  impactoAlertasRs: IMPACTO_ALERTAS_RS,
  oportunidadeAlertasRs: OPORTUNIDADE_ALERTAS_RS,
  riscoAlertasRs: RISCO_ALERTAS_RS,
  /** Os 10 agentes do hub — quem responde por cada elo da cadeia. */
  agentes: {
    lista: AGENTES,
    get: getAgente,
    conflito: CONFLITO_ORQUESTRADO,
    moinhoMaisCompetitivo: MOINHO_MAIS_COMPETITIVO,
  },
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
    margemCapturadaYtdRs: MARGEM_CAPTURADA_YTD_RS,
    margemPorDecisao: MARGEM_POR_DECISAO_VRO,
    recomendacoes: RECOMENDACOES_VRO,
    metricas: METRICAS_VRO,
    alavancas: ALAVANCAS_VRO,
    curva: CURVA_VRO,
  },
  /**
   * Elo 2→5 da cadeia: farinha, demanda, comercial e a decisão Make/Buy/Sell.
   * Tudo aqui DERIVA do elo do trigo (o TLC), então o cenário continua único:
   * mexeu na compra, moveu o custo da farinha, a margem e a recomendação.
   */
  farinha: {
    specs: FARINHAS,
    economiaMoagem: ECONOMIA_MOAGEM,
    precosExternos: PRECOS_FARINHA_EXTERNOS,
    precoExternoComparavel,
    /** Mercado de farinha: só séries apples-to-apples entram na tendência. */
    mercado: {
      series: SERIES_FARINHA_MERCADO,
      meses: MESES_SERIE_FARINHA,
      tendencia: TENDENCIA_FARINHA_CONSOLIDADA,
      concorrentes: CONCORRENTES_FARINHA,
      oportunidadesRegionais,
      naoComparaveis: COTACOES_NAO_COMPARAVEIS,
      notaMargemReferencia: NOTA_MARGEM_REFERENCIA,
    },
    kpis: KPIS_FARINHA,
    capacidadeOciosaTotalT: CAPACIDADE_OCIOSA_TOTAL_T,
    /** Motor econômico — as funções que as telas chamam. */
    custoInterno: custoInternoFarinha,
    ganhoVerticalizacao,
    margemVendaExterna,
    decisaoMakeBuySell,
    capacidadeFarinhaT,
    capacidadeOciosaFarinhaT,
  },
  /** Performance dos moinhos: eficiência por unidade e retrato do parque. */
  moinhos: {
    eficiencia: eficienciaMoinho,
    eficiencias: eficienciaMoinhos,
    resumoParque: resumoParqueMoageiro,
  },
  demanda: {
    familias: DEMANDA_FARINHA,
    calendario: CALENDARIO_DEMANDA,
    necessidadeFarinhaMesT: NECESSIDADE_FARINHA_MES_T,
    necessidadeTrigoMesT: NECESSIDADE_TRIGO_MES_T,
    necessidadeTrigoAnoT: NECESSIDADE_TRIGO_ANO_T,
    /** Alocação por moinho: quanto fica dentro e quanto pode ir ao mercado. */
    planoMoinhos: planoPorMoinho(),
    farinhaDisponivelMercadoT: FARINHA_DISPONIVEL_MERCADO_T,
  },
  /** Lotes em silo — a matéria-prima que o agente de Blend combina. */
  estoqueTrigo: { lotes: LOTES_TRIGO },
  comercial: {
    clientes: CLIENTES_EXTERNOS,
    oportunidades: OPORTUNIDADES_COMERCIAIS,
    margemRecomendadasRs: MARGEM_OPORTUNIDADES_RECOMENDADAS_RS,
    volumeRecomendadasT: VOLUME_OPORTUNIDADES_RECOMENDADAS_T,
  },
  makeBuySell: {
    cenarios: CENARIOS_MAKE_BUY_SELL,
    ancora: CENARIO_MBS_ANCORA,
    beneficioRs: BENEFICIO_MAKE_BUY_SELL_RS,
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
export * from './economics'
export { FARINHAS, PRECOS_FARINHA_EXTERNOS, getFarinha, precoExternoComparavel } from './farinha'
export {
  ECONOMIA_MOAGEM,
  MOINHOS,
  creditoFareloRsT,
  getMoinho,
  getOrigem,
  getPorto,
  regiaoDoMoinho,
} from './dominio'
export { DEMANDA_FARINHA, CALENDARIO_DEMANDA } from './demanda'
export {
  CANAIS_FARINHA,
  CLIENTES_EXTERNOS,
  OPORTUNIDADES_COMERCIAIS,
  REGIOES_COMERCIAIS,
  getClienteExterno,
  resumoPorRegiao,
} from './comercial'
export { CENARIOS_MAKE_BUY_SELL, CENARIO_MBS_ANCORA, KPIS_FARINHA } from './makeBuySell'
export { AGENTES, CONFLITO_ORQUESTRADO, getAgente, nomeCurtoAgente } from './agentes'
export {
  CONCORRENTES_FARINHA,
  SERIES_FARINHA_MERCADO,
  TENDENCIA_FARINHA_CONSOLIDADA,
  oportunidadesRegionais,
} from './mercadoFarinha'
export { TLC_BASELINE_RS, TLC_RECOMENDADO_RS, calcularTlcMock } from './tlc'
export {
  ESPECIFICACOES_BLEND,
  LOTES_TRIGO,
  analisarLotes,
  otimizarBlend,
} from './estoqueTrigo'
export { FONTES, FONTES_LISTA, FONTE_FRANKFURTER, FONTE_OPEN_METEO, FONTE_GDELT, FONTE_WHEAT_REF, fonteDe } from './sources'
