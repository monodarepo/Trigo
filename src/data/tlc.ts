import type {
  AlternativaCompra,
  ComponenteTLC,
  MoinhoId,
  OrigemId,
  ResultadoTlc,
  SelecaoTlc,
} from './types'
import { getMoinho, getOrigem, getPorto } from './dominio'
import { MV_RIO_PARANA } from './logistica'
import { PRECOS_ATUAIS } from './mercado'

/** Baseline: comprar no fluxo normal em ~30 dias (preço projetado + frete cheio). */
export const TLC_BASELINE_RS = 1520

const CAMBIO = PRECOS_ATUAIS.cambioBrlUsd
const CBOT = PRECOS_ATUAIS.cbotUsdT
const round1 = (v: number) => Math.round(v * 10) / 10

/** FOB por origem (US$/t) — coerente com PRECOS_ATUAIS e com as curvas de previsão. */
const FOB_ORIGEM_USD: Record<OrigemId, number> = {
  argentina: PRECOS_ATUAIS.fobArgentinaUsdT, // 253
  'eua-golfo': PRECOS_ATUAIS.fobHrwUsdT, // 262
  canada: 273,
  russia: PRECOS_ATUAIS.fobMarNegroUsdT, // 231
  uruguai: 256,
  brasil: 0,
}

const FRETE_ORIGEM_USD: Record<OrigemId, number> = {
  argentina: PRECOS_ATUAIS.freteArgentinaNordesteUsdT, // 19
  'eua-golfo': 28,
  canada: 33,
  russia: 31,
  uruguai: 20,
  brasil: 0,
}

/** Risco de qualidade precificado (R$/t) — DON/variabilidade por origem. */
const RISCO_QUALIDADE_RS: Record<OrigemId, number> = {
  argentina: 4.2,
  'eua-golfo': 2.8,
  canada: 2.2,
  russia: 14.6,
  uruguai: 5.4,
  brasil: 7.8,
}

/** Transporte porto → moinho (R$/t): via porto preferencial vs outro porto. */
const TRANSPORTE_RS: Record<MoinhoId, { preferencial: number; outro: number }> = {
  fortaleza: { preferencial: 9.2, outro: 16.8 },
  eusebio: { preferencial: 9.8, outro: 15.4 },
  natal: { preferencial: 8.6, outro: 34.0 },
  salvador: { preferencial: 9.4, outro: 41.0 },
  cabedelo: { preferencial: 8.8, outro: 30.5 },
  rolandia: { preferencial: 96.0, outro: 118.0 },
  'bento-goncalves': { preferencial: 112.0, outro: 134.0 },
}

/** Compra doméstica (RS/PR): preço balcão + rodoviário até o moinho. */
const PRECO_DOMESTICO_RS = 1310
const TRANSPORTE_DOMESTICO_RS: Record<MoinhoId, number> = {
  rolandia: 38,
  'bento-goncalves': 52,
  salvador: 98,
  cabedelo: 108,
  natal: 112,
  eusebio: 115,
  fortaleza: 118,
}

export const SELECAO_TLC_DEFAULT: SelecaoTlc = {
  origemId: 'argentina',
  portoId: 'pecem',
  moinhoId: 'eusebio',
  incoterm: 'FOB',
}

/**
 * Mock determinístico do motor de TLC: recompõe o waterfall para qualquer
 * combinação origem × porto × moinho × incoterm com valores plausíveis
 * pré-definidos (sem cálculo real de mercado). A seleção default reproduz
 * exatamente o TLC recomendado de R$ 1.480/t.
 */
export function calcularTlcMock(selecao: SelecaoTlc): ResultadoTlc {
  const moinho = getMoinho(selecao.moinhoId)!

  if (selecao.origemId === 'brasil') {
    const componentes: ComponenteTLC[] = [
      {
        rotulo: 'Preço doméstico posto origem (RS/PR)',
        rotuloCurto: 'Preço doméstico',
        valorRs: PRECO_DOMESTICO_RS,
        tipo: 'fob',
        descricao: 'Compra interna — sem FOB, frete marítimo ou câmbio',
      },
      {
        rotulo: 'Transporte rodoviário até o moinho',
        rotuloCurto: 'Transp. rodoviário',
        valorRs: TRANSPORTE_DOMESTICO_RS[selecao.moinhoId],
        tipo: 'transporte',
      },
      { rotulo: 'Armazenagem', rotuloCurto: 'Armazenagem', valorRs: 5.5, tipo: 'armazenagem' },
      { rotulo: 'Custo de capital (~10 dias)', rotuloCurto: 'Custo de capital', valorRs: 4, tipo: 'capital' },
    ]
    const totalRs = round1(componentes.reduce((s, c) => s + c.valorRs, 0))
    const risco = { demurrageRs: 0, qualidadeRs: RISCO_QUALIDADE_RS.brasil, atrasoRs: 0.5 }
    const riscoTotal = round1(risco.demurrageRs + risco.qualidadeRs + risco.atrasoRs)
    return {
      selecao,
      componentes,
      totalRs,
      deltaVsBaselineRs: Math.round(totalRs - TLC_BASELINE_RS),
      risco: { ...risco, totalRs: riscoTotal, pctDoTlc: round1((riscoTotal / totalRs) * 100) },
    }
  }

  const origem = getOrigem(selecao.origemId)!
  const porto = getPorto(selecao.portoId)!
  const fobUsd = FOB_ORIGEM_USD[selecao.origemId]
  const freteUsd = FRETE_ORIGEM_USD[selecao.origemId]
  const premioUsd = fobUsd - CBOT

  const freteRs = round1(freteUsd * CAMBIO)
  const seguroRs = round1(0.00276 * (fobUsd + freteUsd) * CAMBIO + (selecao.origemId === 'russia' ? 0.8 : 0))
  const afrmmRs = round1(0.08 * freteUsd * CAMBIO)
  const impostoPct = origem.mercosul ? 0 : 10
  const impostoRs = impostoPct === 0 ? 0 : round1(0.1 * ((fobUsd + freteUsd) * CAMBIO + seguroRs))
  const demurrageRs = round1(1.2 + 2.3 * porto.filaNavios)
  const transporteRs =
    porto.id === moinho.portoPreferencialId
      ? TRANSPORTE_RS[moinho.id].preferencial
      : TRANSPORTE_RS[moinho.id].outro
  const capitalRs = round1(13.5 * (origem.transitoDias / 12))

  const cfr = selecao.incoterm === 'CFR'
  const cif = selecao.incoterm === 'CIF'
  const baseRs = round1(CBOT * CAMBIO)
  const fobLinhaRs = round1(baseRs + (cfr || cif ? freteRs : 0) + (cif ? seguroRs : 0))
  const cambioFmt = `R$ ${CAMBIO.toFixed(2).replace('.', ',')}`

  const componentes: ComponenteTLC[] = [
    {
      rotulo: cif ? 'Preço CIF (CBOT + frete + seguro)' : cfr ? 'Preço CFR (CBOT + frete)' : 'FOB trigo (CBOT)',
      rotuloCurto: cif ? 'Preço CIF' : cfr ? 'Preço CFR' : 'FOB (CBOT)',
      valorRs: fobLinhaRs,
      tipo: 'fob',
      descricao: `US$ ${CBOT}/t × ${cambioFmt}${cfr || cif ? ' + custos embutidos no incoterm' : ''}`,
    },
    {
      rotulo: `Prêmio origem ${origem.nome}`,
      rotuloCurto: 'Prêmio origem',
      valorRs: round1(premioUsd * CAMBIO),
      tipo: 'premio',
      descricao: `US$ ${premioUsd}/t × câmbio — FOB total US$ ${fobUsd}/t`,
    },
    {
      rotulo: cfr || cif ? 'Frete marítimo (incluído no incoterm)' : `Frete marítimo → ${porto.nome}`,
      rotuloCurto: 'Frete marítimo',
      valorRs: cfr || cif ? 0 : freteRs,
      tipo: 'frete',
      descricao: cfr || cif ? `US$ ${freteUsd}/t já embutidos no preço ${selecao.incoterm}` : `US$ ${freteUsd}/t × ${cambioFmt}`,
    },
    {
      rotulo: cif ? 'Seguro da carga (incluído no incoterm)' : 'Seguro da carga',
      rotuloCurto: 'Seguro',
      valorRs: cif ? 0 : seguroRs,
      tipo: 'seguro',
      descricao: cif ? 'Já embutido no preço CIF' : '~0,3% do CIF' + (selecao.origemId === 'russia' ? ' + prêmio de risco de guerra' : ''),
    },
    { rotulo: 'AFRMM (8% do frete)', rotuloCurto: 'AFRMM', valorRs: afrmmRs, tipo: 'taxa' },
    {
      rotulo: `Imposto de importação (${impostoPct === 0 ? 'Mercosul 0%' : 'extra-Mercosul 10%'})`,
      rotuloCurto: `Imposto ${impostoPct}%`,
      valorRs: impostoRs,
      tipo: 'imposto',
      descricao: impostoPct === 0 ? '0% intra-Mercosul' : '10% sobre o CIF (origem extra-Mercosul)',
    },
    { rotulo: `Despesas portuárias (${porto.nome})`, rotuloCurto: 'Desp. portuárias', valorRs: porto.custoPortuarioRsT, tipo: 'porto' },
    {
      rotulo: 'Demurrage (risco esperado)',
      rotuloCurto: 'Demurrage (risco)',
      valorRs: demurrageRs,
      tipo: 'risco',
      descricao:
        porto.id === 'pecem'
          ? `Fila de ${porto.filaNavios} navios em Pecém e atraso do ${MV_RIO_PARANA.navio} elevam o risco da janela`
          : `Fila de ${porto.filaNavios} navio(s) em ${porto.nome}`,
    },
    { rotulo: 'Armazenagem portuária', rotuloCurto: 'Armazenagem', valorRs: 4.9, tipo: 'armazenagem' },
    {
      rotulo: `Transporte interno ${porto.nome} → moinho ${moinho.nome}`,
      rotuloCurto: 'Transp. interno',
      valorRs: transporteRs,
      tipo: 'transporte',
    },
    { rotulo: 'Proteção cambial (custo NDF)', rotuloCurto: 'Proteção cambial', valorRs: 3.2, tipo: 'cambio' },
    {
      rotulo: `Custo de capital (~${Math.round(origem.transitoDias + 28)} dias)`,
      rotuloCurto: 'Custo de capital',
      valorRs: capitalRs,
      tipo: 'capital',
    },
  ]

  const totalRs = round1(componentes.reduce((s, c) => s + c.valorRs, 0))
  const risco = {
    demurrageRs,
    qualidadeRs: RISCO_QUALIDADE_RS[selecao.origemId],
    atrasoRs: round1(1.7 * porto.filaNavios + (origem.transitoDias >= 20 ? 2.4 : 0.8)),
  }
  const riscoTotal = round1(risco.demurrageRs + risco.qualidadeRs + risco.atrasoRs)

  return {
    selecao,
    componentes,
    totalRs,
    deltaVsBaselineRs: Math.round(totalRs - TLC_BASELINE_RS),
    risco: { ...risco, totalRs: riscoTotal, pctDoTlc: round1((riscoTotal / totalRs) * 100) },
  }
}

/** Resultado da combinação recomendada (Argentina · Pecém · Eusébio · FOB). */
export const RESULTADO_TLC_RECOMENDADO = calcularTlcMock(SELECAO_TLC_DEFAULT)

/** Decomposição do TLC recomendado — soma exatamente R$ 1.480/t. */
export const COMPONENTES_TLC_RECOMENDADO: ComponenteTLC[] = RESULTADO_TLC_RECOMENDADO.componentes

/** TLC recomendado derivado da soma dos componentes (R$ 1.480/t). */
export const TLC_RECOMENDADO_RS = Math.round(RESULTADO_TLC_RECOMENDADO.totalRs)

/**
 * Alternativas comparadas pelo otimizador. A primeira é a recomendada;
 * deltaVsBaselineRs compara com o baseline de R$ 1.520/t.
 */
export const ALTERNATIVAS_COMPRA: AlternativaCompra[] = [
  {
    id: 'alt-argentina-pecem',
    origemId: 'argentina',
    portoId: 'pecem',
    fornecedorId: 'molinos-del-plata',
    fobUsd: 253,
    freteUsd: 19,
    impostoPct: 0,
    tlcRs: TLC_RECOMENDADO_RS,
    deltaVsBaselineRs: TLC_RECOMENDADO_RS - TLC_BASELINE_RS,
    qualidade: { proteina: 11.5, w: 280, fallingNumber: 320, pl: 0.9, pesoHectolitrico: 79, umidade: 12.5, cinzas: 1.55, don: 600 },
    atendeEspec: true,
    volumeDisponivelToneladas: 45_000,
    recomendada: true,
    observacao: 'Janela de frete de 5 dias antes da disputa com embarques de milho.',
  },
  {
    id: 'alt-eua-suape',
    origemId: 'eua-golfo',
    portoId: 'suape',
    fornecedorId: 'gulf-harvest',
    fobUsd: 262,
    freteUsd: 28,
    impostoPct: 10,
    tlcRs: 1736,
    deltaVsBaselineRs: 216,
    qualidade: { proteina: 12.5, w: 320, fallingNumber: 340, pl: 1.1, pesoHectolitrico: 80, umidade: 12, cinzas: 1.5, don: 400 },
    atendeEspec: true,
    volumeDisponivelToneladas: 30_000,
    observacao: 'Imposto de 10% extra-Mercosul pesa; manter HRW apenas na parcela de blend.',
  },
  {
    id: 'alt-russia-suape',
    origemId: 'russia',
    portoId: 'suape',
    fornecedorId: 'azov-commodities',
    fobUsd: 231,
    freteUsd: 31,
    impostoPct: 10,
    tlcRs: 1581,
    deltaVsBaselineRs: 61,
    qualidade: { proteina: 12, w: 260, fallingNumber: 280, pl: 1.0, pesoHectolitrico: 78, umidade: 13, cinzas: 1.6, don: 1800 },
    atendeEspec: false,
    volumeDisponivelToneladas: 27_000,
    observacao: 'DON de 1.800 ppb acima da política para biscoito; trânsito de 26 dias.',
  },
  {
    id: 'alt-uruguai-cabedelo',
    origemId: 'uruguai',
    portoId: 'cabedelo',
    fornecedorId: 'cereales-del-este',
    fobUsd: 256,
    freteUsd: 20,
    impostoPct: 0,
    tlcRs: 1507,
    deltaVsBaselineRs: -13,
    qualidade: { proteina: 11, w: 250, fallingNumber: 300, pl: 0.85, pesoHectolitrico: 78, umidade: 13, cinzas: 1.55, don: 700 },
    atendeEspec: true,
    volumeDisponivelToneladas: 12_000,
    observacao: 'Apenas 12.000 t disponíveis na janela — não cobre a necessidade.',
  },
  {
    id: 'alt-brasil-rs',
    origemId: 'brasil',
    fornecedorId: 'coop-triticola-rs',
    impostoPct: 0,
    tlcRs: 1425,
    deltaVsBaselineRs: -95,
    qualidade: { proteina: 10.5, w: 190, fallingNumber: 250, pl: 0.7, pesoHectolitrico: 77, umidade: 13.5, cinzas: 1.5, don: 900 },
    atendeEspec: false,
    volumeDisponivelToneladas: 8_000,
    observacao: 'Compra doméstica (RS, rodoviário). W 190 só atende biscoito; frete ao Nordeste anula a vantagem.',
  },
]
