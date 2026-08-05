/**
 * SIMULADOR MAKE / BUY / SELL — o centro da tese v2.
 *
 * Recalcula, ao vivo, o destino da farinha de um moinho × spec quando o
 * usuário mexe em preço externo, preço de venda, câmbio, custo do trigo,
 * demanda, capacidade, custo de servir e margem mínima.
 *
 * Duas regras que este módulo protege:
 *  1. O câmbio move o TLC do trigo de verdade — só a PARCELA EM DÓLAR dele,
 *     decomposta pelo motor de TLC. Frete interno e despesas portuárias são
 *     em reais e não deveriam variar com o dólar.
 *  2. Vender com a capacidade CHEIA não custa o custo marginal: custa o
 *     CUSTO DE REPOSIÇÃO, porque cada tonelada vendida obriga a comprar uma
 *     tonelada de fora para as fábricas. Ignorar isso é o erro que faz uma
 *     venda destruidora de margem parecer lucrativa.
 */
import type { AlternativaMbs, FarinhaId, MoinhoId } from './types'
import { ECONOMIA_MOAGEM, getMoinho, regiaoDoMoinho } from './dominio'
import { getFarinha, precoExternoComparavel } from './farinha'
import {
  FARINHA_ANCORA,
  MOINHO_ANCORA,
  capacidadeFarinhaT,
  custoInternoFarinha,
  rendimentoEfetivoPct,
  tlcReferenciaMoinho,
} from './economics'
import { calcularTlcMock } from './tlc'
import { PRECOS_ATUAIS } from './mercado'
import { CENARIO_MBS_ANCORA } from './makeBuySell'

const arred1 = (v: number) => Math.round(v * 10) / 10

/** Componentes do TLC cujo valor nasce em dólar e escala com o câmbio. */
const TIPOS_EM_DOLAR = new Set(['fob', 'premio', 'frete', 'seguro', 'taxa', 'imposto'])

export interface DecomposicaoCambial {
  /** Parcela do TLC denominada em dólar, convertida para US$/t. */
  usdPorT: number
  /** Parcela do TLC que já nasce em reais (porto, frete interno, capital). */
  brlFixoRsT: number
  /** Câmbio em que a decomposição foi feita. */
  cambioBase: number
}

/**
 * Separa o TLC do moinho em parcela dolarizada e parcela em reais, para que o
 * slider de câmbio mova só o que de fato varia com o dólar.
 */
export function decomposicaoCambialDoTlc(moinhoId: MoinhoId): DecomposicaoCambial {
  const moinho = getMoinho(moinhoId)!
  const cambioBase = PRECOS_ATUAIS.cambioBrlUsd
  const tlc = calcularTlcMock({
    origemId: 'argentina',
    portoId: moinho.portoPreferencialId,
    moinhoId,
    incoterm: 'FOB',
  })
  const emDolarRs = tlc.componentes
    .filter((c) => TIPOS_EM_DOLAR.has(c.tipo))
    .reduce((soma, c) => soma + c.valorRs, 0)
  // Sem arredondar aqui: um décimo de erro na parcela em dólar reaparece
  // multiplicado pelo rendimento e tira a âncora de R$ 2.100/t do lugar.
  return {
    usdPorT: emDolarRs / cambioBase,
    brlFixoRsT: tlc.totalRs - emDolarRs,
    cambioBase,
  }
}

/** TLC do trigo (R$/t) recomposto para um câmbio arbitrário. */
export function tlcNoCambio(moinhoId: MoinhoId, cambio: number): number {
  const d = decomposicaoCambialDoTlc(moinhoId)
  return arred1(d.brlFixoRsT + d.usdPorT * cambio)
}

// ---------------------------------------------------------------------------
// Inputs do simulador
// ---------------------------------------------------------------------------

export interface InputsSimuladorMbs {
  moinhoId: MoinhoId
  farinhaId: FarinhaId
  /** Preço da farinha externa comparável, mesma spec (R$/t). */
  precoExternoRsT: number
  /** Preço líquido de venda a terceiros (R$/t). */
  precoVendaRsT: number
  /** Câmbio R$/US$ — move a parcela dolarizada do TLC. */
  cambio: number
  /** Choque adicional no custo do trigo (R$/t), somado ao TLC do câmbio. */
  choqueTrigoRsT: number
  /** Demanda interna de farinha na janela (t/mês). */
  demandaT: number
  /** Capacidade de produção de farinha na janela (t/mês). */
  capacidadeT: number
  /** Custo de servir a venda externa (R$/t): frete, comissão, risco. */
  custoServirRsT: number
  /** Margem mínima exigida para aprovar venda externa (R$/t). */
  margemMinimaRsT: number
  /** Demanda externa acessível na janela (t/mês) — teto da venda. Sem ela, a
   * alocação venderia toda a folga a compradores que não existem. */
  demandaExternaT: number
}

/** Inputs iniciais: o cenário-âncora, para o "Resetar" sempre ter destino. */
export function inputsIniciais(
  moinhoId: MoinhoId = MOINHO_ANCORA,
  farinhaId: FarinhaId = FARINHA_ANCORA,
): InputsSimuladorMbs {
  const externo = precoExternoComparavel(farinhaId, regiaoDoMoinho(moinhoId))
  const ancoraMesmoMoinho = CENARIO_MBS_ANCORA.moinhoId === moinhoId
  return {
    moinhoId,
    farinhaId,
    precoExternoRsT: externo?.precoRsT ?? Math.round(custoInternoFarinha(moinhoId, farinhaId).totalRsT),
    precoVendaRsT: ancoraMesmoMoinho
      ? CENARIO_MBS_ANCORA.precoVendaLiquidoRsT
      : Math.round((externo?.precoRsT ?? 2400) * 1.06),
    cambio: PRECOS_ATUAIS.cambioBrlUsd,
    choqueTrigoRsT: 0,
    demandaT: ancoraMesmoMoinho ? CENARIO_MBS_ANCORA.volumeT : 6000,
    capacidadeT: capacidadeFarinhaT(moinhoId, farinhaId),
    custoServirRsT: ECONOMIA_MOAGEM.custoServirRsT,
    margemMinimaRsT: 200,
    demandaExternaT: ancoraMesmoMoinho ? 1600 : 1200,
  }
}

// ---------------------------------------------------------------------------
// Custos recalculados sob os inputs
// ---------------------------------------------------------------------------

export interface CustosSimulados {
  /** TLC do trigo sob o câmbio e o choque escolhidos (R$/t de trigo). */
  tlcTrigoRsT: number
  rendimentoPct: number
  /** Custo pleno absorvido (R$/t de farinha). */
  custoInternoRsT: number
  /** Custo evitável (sem depreciação) — base do Make/Buy. */
  custoEvitavelRsT: number
  /** Custo marginal (trigo + logística + variáveis − farelo). */
  custoMarginalRsT: number
  creditoFareloRsT: number
  /** Quanto o cenário simulado se afastou do custo de regime (R$/t). */
  deltaVsRegimeRsT: number
}

/**
 * Recalcula o custo da farinha sob os inputs. Reaproveita a composição do
 * motor e desloca apenas o que o usuário mexeu: o trigo. Os demais componentes
 * (conversão, energia, perdas, depreciação, farelo) são da unidade e não
 * mudam com preço de mercado.
 */
export function custosSimulados(inputs: InputsSimuladorMbs): CustosSimulados {
  const { moinhoId, farinhaId } = inputs
  const base = custoInternoFarinha(moinhoId, farinhaId)
  const rendimentoPct = rendimentoEfetivoPct(moinhoId, farinhaId)
  const fator = 100 / rendimentoPct

  const tlcRegime = tlcReferenciaMoinho(moinhoId) + getFarinha(farinhaId)!.premioBlendRsT
  const tlcTrigoRsT = arred1(
    tlcNoCambio(moinhoId, inputs.cambio) + getFarinha(farinhaId)!.premioBlendRsT + inputs.choqueTrigoRsT,
  )
  // Só a linha do trigo se move; a diferença entra no custo por tonelada de
  // farinha pela mesma conversão de rendimento do motor.
  const deltaTrigoRsT = arred1((tlcTrigoRsT - tlcRegime) * fator)

  const custoInternoRsT = arred1(base.totalRsT + deltaTrigoRsT)
  const creditoFareloRsT = Math.abs(base.componentes.find((c) => c.tipo === 'credito')!.valorRs)

  return {
    tlcTrigoRsT,
    rendimentoPct,
    custoInternoRsT,
    custoEvitavelRsT: arred1(custoInternoRsT - getMoinho(moinhoId)!.depreciacaoRsT),
    custoMarginalRsT: arred1(base.custoMarginalRsT + deltaTrigoRsT),
    creditoFareloRsT,
    deltaVsRegimeRsT: deltaTrigoRsT,
  }
}

// ---------------------------------------------------------------------------
// As alternativas
// ---------------------------------------------------------------------------

export type NivelRisco = 'baixo' | 'medio' | 'alto'

export interface AlternativaSimulada {
  alternativa: AlternativaMbs
  rotulo: string
  /** Resultado em R$/t, contra a referência de comprar no mercado (= 0). */
  resultadoRsT: number
  /** Tonelagem a que a alternativa se aplica (t/mês). */
  volumeT: number
  /** Resultado no volume aplicável (R$/mês). */
  resultadoRs: number
  risco: NivelRisco
  motivoRisco: string
  viavel: boolean
  nota: string
  /** Alternativa principal (as 3 do topo) ou secundária (estoque/parar). */
  principal: boolean
}

const ROTULOS: Record<AlternativaMbs, string> = {
  'produzir-consumir': 'Produzir e consumir',
  comprar: 'Comprar farinha',
  'produzir-vender': 'Produzir e vender',
  estoque: 'Produzir para estoque',
  'parar-moagem': 'Reduzir/parar moagem',
}

// ---------------------------------------------------------------------------
// Alocação de capacidade
// ---------------------------------------------------------------------------

export interface FatiaAlocacao {
  chave: 'produzir-consumir' | 'comprar' | 'produzir-vender' | 'ociosa'
  rotulo: string
  toneladas: number
  /** Resultado unitário da fatia (R$/t). */
  unitarioRsT: number
  totalRs: number
  cor: 'gold' | 'info' | 'positive' | 'faint'
}

export interface AlocacaoCapacidade {
  capacidadeT: number
  demandaT: number
  /** true quando a capacidade não cobre a demanda interna. */
  capacidadeRestrita: boolean
  /** Custo de a venda externa deslocar consumo próprio (R$/t): o preço de
   * repor a farinha comprando de terceiros. Só existe com capacidade restrita. */
  custoReposicaoRsT: number | null
  /** Margem efetiva da venda: contra o custo marginal (folga) ou contra o
   * custo de reposição (capacidade restrita). */
  margemVendaEfetivaRsT: number
  fatias: FatiaAlocacao[]
  /** Resultado consolidado da alocação (R$/mês). */
  resultadoRs: number
  /** Resultado de moer tudo que couber sem avaliar se compensa (R$/mês). */
  resultadoIngenuoRs: number
  /** Valor da DECISÃO (R$/mês) = alocação escolhida − alocação ingênua. */
  beneficioDecisaoRs: number
  racional: string
}

/**
 * Aloca a capacidade limitada entre consumo interno e venda externa.
 *
 * Ordem: a demanda das fábricas vem primeiro (é o núcleo do negócio e o
 * controle de qualidade do blend); o excedente vai para venda quando a margem
 * bate a mínima exigida. Com capacidade restrita, a venda passa a competir com
 * o consumo próprio e é medida contra o CUSTO DE REPOSIÇÃO, não contra o
 * custo marginal.
 */
export function alocarCapacidade(
  inputs: InputsSimuladorMbs,
  custos: CustosSimulados,
): AlocacaoCapacidade {
  const { capacidadeT, demandaT, precoExternoRsT, precoVendaRsT, custoServirRsT, margemMinimaRsT } =
    inputs

  const capacidadeRestrita = capacidadeT < demandaT
  const produzirCompensa = custos.custoInternoRsT < precoExternoRsT

  // 1) Demanda interna
  const produzirConsumirT = produzirCompensa ? Math.min(capacidadeT, demandaT) : 0
  const comprarT = Math.max(0, demandaT - produzirConsumirT)

  // 2) Excedente para venda
  const sobraT = Math.max(0, capacidadeT - produzirConsumirT)
  const custoReposicaoRsT = capacidadeRestrita ? precoExternoRsT : null
  const margemVendaEfetivaRsT = arred1(
    precoVendaRsT - custoServirRsT - (custoReposicaoRsT ?? custos.custoMarginalRsT),
  )
  const tetoVendaT = Math.min(sobraT, inputs.demandaExternaT)
  const vendeu = margemVendaEfetivaRsT >= margemMinimaRsT && tetoVendaT > 0
  const produzirVenderT = vendeu ? tetoVendaT : 0
  const ociosaT = Math.max(0, sobraT - produzirVenderT)

  const ganhoProduzirRsT = arred1(precoExternoRsT - custos.custoInternoRsT)
  const fatias: FatiaAlocacao[] = ([
    {
      chave: 'produzir-consumir',
      rotulo: 'Produzir e consumir',
      toneladas: produzirConsumirT,
      unitarioRsT: ganhoProduzirRsT,
      totalRs: Math.round(ganhoProduzirRsT * produzirConsumirT),
      cor: 'gold',
    },
    {
      chave: 'comprar',
      rotulo: 'Comprar de terceiros',
      toneladas: comprarT,
      unitarioRsT: 0,
      totalRs: 0,
      cor: 'info',
    },
    {
      chave: 'produzir-vender',
      rotulo: 'Produzir e vender',
      toneladas: produzirVenderT,
      unitarioRsT: margemVendaEfetivaRsT,
      totalRs: Math.round(margemVendaEfetivaRsT * produzirVenderT),
      cor: 'positive',
    },
    {
      chave: 'ociosa',
      rotulo: 'Capacidade parada',
      toneladas: ociosaT,
      unitarioRsT: 0,
      totalRs: 0,
      cor: 'faint',
    },
  ] satisfies FatiaAlocacao[]).filter((f) => f.toneladas > 0)

  const resultadoRs = fatias.reduce((soma, f) => soma + f.totalRs, 0)
  // Referência ingênua: moer tudo que couber da demanda, mesmo destruindo
  // valor, e não vender nada. É o que aconteceria sem o hub decidindo.
  const resultadoIngenuoRs = Math.round(ganhoProduzirRsT * Math.min(capacidadeT, demandaT))
  const ton = (v: number) => Math.round(v).toLocaleString('pt-BR')
  const brl = (v: number) => `R$ ${v.toFixed(1).replace('.', ',')}`

  const racional = capacidadeRestrita
    ? `Capacidade de ${ton(capacidadeT)} t não cobre a demanda de ${ton(demandaT)} t: ${ton(comprarT)} t vêm de terceiros. ` +
      `Nessa situação cada tonelada vendida força comprar outra a ${brl(precoExternoRsT)}/t — a venda é medida contra esse custo de reposição, ` +
      `e rende ${brl(margemVendaEfetivaRsT)}/t${vendeu ? '' : ', abaixo da margem mínima exigida'}.`
    : produzirCompensa
      ? `A demanda de ${ton(demandaT)} t é atendida com produção própria (${brl(ganhoProduzirRsT)}/t de ganho sobre comprar). ` +
        `Sobram ${ton(sobraT)} t de capacidade: ${vendeu ? `${ton(produzirVenderT)} t vendidas a ${brl(margemVendaEfetivaRsT)}/t de margem sobre o custo marginal, limitadas pela demanda externa acessível` : `paradas, porque a margem de ${brl(margemVendaEfetivaRsT)}/t não alcança a mínima de ${brl(margemMinimaRsT)}/t`}.`
      : `Custo interno de ${brl(custos.custoInternoRsT)}/t supera o mercado (${brl(precoExternoRsT)}/t): a demanda inteira vem de compra, ` +
        `e a capacidade fica livre — ${vendeu ? `com ${ton(produzirVenderT)} t indo para venda externa` : 'sem venda que pague a margem mínima'}.`

  return {
    capacidadeT,
    demandaT,
    capacidadeRestrita,
    custoReposicaoRsT,
    margemVendaEfetivaRsT,
    fatias,
    resultadoRs,
    resultadoIngenuoRs,
    beneficioDecisaoRs: resultadoRs - resultadoIngenuoRs,
    racional,
  }
}

// ---------------------------------------------------------------------------
// O resultado do simulador
// ---------------------------------------------------------------------------

export interface ResultadoSimuladorMbs {
  inputs: InputsSimuladorMbs
  custos: CustosSimulados
  alternativas: AlternativaSimulada[]
  /** A alternativa recomendada para a DEMANDA interna. */
  recomendada: AlternativaMbs
  alocacao: AlocacaoCapacidade
  /** Benefício consolidado (R$/mês): quanto a alocação escolhida rende a mais
   * que moer tudo sem avaliar — o valor que a decisão acrescenta. */
  beneficioRs: number
  /** Margem da venda no CUSTO PLENO (R$/t) — a leitura de P&L, que no cenário
   * -âncora vale os R$ 280/t do CLAUDE.md. Convive com a margem incremental
   * (contra o custo marginal), que é a base de decidir usar capacidade ociosa. */
  margemVendaPlenaRsT: number
  /** Efeito no custo de matéria-prima da farinha (%). */
  efeitoMargemPct: number
}

function risco(
  alternativa: AlternativaMbs,
  inputs: InputsSimuladorMbs,
  custos: CustosSimulados,
  aloc: AlocacaoCapacidade,
): { nivel: NivelRisco; motivo: string } {
  const folgaVsExterno = inputs.precoExternoRsT - custos.custoInternoRsT
  switch (alternativa) {
    case 'produzir-consumir':
      return folgaVsExterno < 40
        ? { nivel: 'alto', motivo: 'Vantagem menor que R$ 40/t: uma alta do trigo ou do câmbio apaga o ganho.' }
        : folgaVsExterno < 120
          ? { nivel: 'medio', motivo: 'Vantagem moderada — sensível a choque de câmbio ou de frete.' }
          : { nivel: 'baixo', motivo: 'Vantagem larga e sob controle próprio de qualidade e suprimento.' }
    case 'comprar':
      return {
        nivel: 'medio',
        motivo:
          'Transfere a constância da farinha para terceiros e expõe o abastecimento das fábricas ao mercado spot.',
      }
    case 'produzir-vender':
      return aloc.capacidadeRestrita
        ? { nivel: 'alto', motivo: 'Com capacidade restrita, vender obriga a repor comprando — risco de preço e de suprimento ao mesmo tempo.' }
        : aloc.margemVendaEfetivaRsT < inputs.margemMinimaRsT
          ? { nivel: 'alto', motivo: 'Margem abaixo da mínima exigida pela política comercial.' }
          : { nivel: 'medio', motivo: 'Depende de contrato firme e do risco de crédito do comprador.' }
    case 'estoque':
      return { nivel: 'medio', motivo: 'Só compensa se o mercado subir acima do carrego; imobiliza capital.' }
    case 'parar-moagem':
      return { nivel: 'alto', motivo: 'Fixos e depreciação deixam de ser absorvidos e viram perda pura.' }
  }
}

export function simularMakeBuySell(inputs: InputsSimuladorMbs): ResultadoSimuladorMbs {
  const custos = custosSimulados(inputs)
  const moinho = getMoinho(inputs.moinhoId)!
  const aloc = alocarCapacidade(inputs, custos)

  const ganhoProduzirRsT = arred1(inputs.precoExternoRsT - custos.custoInternoRsT)
  const margemVenderRsT = aloc.margemVendaEfetivaRsT
  const carregoRsT = arred1(8 + custos.custoInternoRsT * 0.0095)
  const ganhoEstoqueRsT = arred1(ganhoProduzirRsT - carregoRsT)
  const fixoNaoAbsorvidoRsT = arred1(
    (moinho.custoConversaoRsT + moinho.energiaManutRsT + moinho.perdasFinanceiroRsT) *
      (1 - ECONOMIA_MOAGEM.parcelaVariavel) +
      moinho.depreciacaoRsT,
  )

  const volumeInterno = Math.min(inputs.capacidadeT, inputs.demandaT)
  const brl = (v: number) => `R$ ${v.toFixed(1).replace('.', ',')}`

  const bruto: Array<Omit<AlternativaSimulada, 'risco' | 'motivoRisco'>> = [
    {
      alternativa: 'produzir-consumir',
      rotulo: ROTULOS['produzir-consumir'],
      resultadoRsT: ganhoProduzirRsT,
      volumeT: volumeInterno,
      resultadoRs: Math.round(ganhoProduzirRsT * volumeInterno),
      viavel: inputs.capacidadeT > 0,
      principal: true,
      nota: `Evita comprar a mesma spec a ${brl(inputs.precoExternoRsT)}/t e mantém o controle do blend.`,
    },
    {
      alternativa: 'comprar',
      rotulo: ROTULOS.comprar,
      resultadoRsT: 0,
      volumeT: inputs.demandaT,
      resultadoRs: 0,
      viavel: true,
      principal: true,
      nota: `Referência da comparação: pagar ${brl(inputs.precoExternoRsT)}/t no mercado e liberar a capacidade.`,
    },
    {
      alternativa: 'produzir-vender',
      rotulo: ROTULOS['produzir-vender'],
      resultadoRsT: margemVenderRsT,
      volumeT: aloc.fatias.find((f) => f.chave === 'produzir-vender')?.toneladas ?? 0,
      resultadoRs: aloc.fatias.find((f) => f.chave === 'produzir-vender')?.totalRs ?? 0,
      viavel: margemVenderRsT >= inputs.margemMinimaRsT,
      principal: true,
      nota: aloc.capacidadeRestrita
        ? `Capacidade restrita: medida contra o custo de reposição de ${brl(inputs.precoExternoRsT)}/t, não contra o custo marginal.`
        : `Usa a capacidade ociosa acima do custo marginal de ${brl(custos.custoMarginalRsT)}/t.`,
    },
    {
      alternativa: 'estoque',
      rotulo: ROTULOS.estoque,
      resultadoRsT: ganhoEstoqueRsT,
      volumeT: volumeInterno,
      resultadoRs: Math.round(ganhoEstoqueRsT * volumeInterno),
      viavel: inputs.capacidadeT > 0,
      principal: false,
      nota: `Mesmo ganho de moer, menos ${brl(carregoRsT)}/t de carrego. Só vira resposta com expectativa de alta.`,
    },
    {
      alternativa: 'parar-moagem',
      rotulo: ROTULOS['parar-moagem'],
      resultadoRsT: -fixoNaoAbsorvidoRsT,
      volumeT: volumeInterno,
      resultadoRs: Math.round(-fixoNaoAbsorvidoRsT * volumeInterno),
      viavel: true,
      principal: false,
      nota: `Diferente de comprar: a capacidade NÃO é redirecionada e ${brl(fixoNaoAbsorvidoRsT)}/t de fixos viram perda.`,
    },
  ]

  const alternativas: AlternativaSimulada[] = bruto.map((a) => {
    const r = risco(a.alternativa, inputs, custos, aloc)
    return { ...a, risco: r.nivel, motivoRisco: r.motivo }
  })

  // A recomendação da DEMANDA disputa entre produzir, comprar e estocar —
  // vender concorre pela capacidade ociosa, na alocação, não pela demanda.
  const daDemanda = alternativas.filter(
    (a) => a.viavel && a.alternativa !== 'produzir-vender' && a.alternativa !== 'parar-moagem',
  )
  const recomendada = daDemanda.reduce((a, b) => (b.resultadoRsT > a.resultadoRsT ? b : a)).alternativa

  // Efeito na margem: o benefício sobre o valor da farinha consumida no mês.
  const valorFarinhaMesRs = inputs.demandaT * inputs.precoExternoRsT
  const margemVendaPlenaRsT = arred1(
    inputs.precoVendaRsT - custos.custoInternoRsT - inputs.custoServirRsT,
  )
  return {
    inputs,
    custos,
    alternativas,
    recomendada,
    alocacao: aloc,
    beneficioRs: aloc.beneficioDecisaoRs,
    margemVendaPlenaRsT,
    efeitoMargemPct:
      valorFarinhaMesRs > 0 ? Math.round((aloc.resultadoRs / valorFarinhaMesRs) * 1000) / 10 : 0,
  }
}

/**
 * Régua de postura sobre a MESMA alocação. Os fatores não são estimativas de
 * mercado: são a política de risco aplicada ao componente de venda externa —
 * o conservador só reconhece a venda já contratada (60%), o oportunístico
 * aceita margem menor e alcança mais compradores (135%). O consumo interno,
 * que é decisão própria, não varia com a postura.
 */
export const PERFIS_POSTURA_MBS = [
  {
    id: 'conservador' as const,
    rotulo: 'Conservador',
    fator: 0.6,
    nota: 'Só o consumo interno e a venda já contratada.',
  },
  {
    id: 'recomendado' as const,
    rotulo: 'Recomendado',
    fator: 1,
    nota: 'A alocação acima, com a margem mínima da política.',
  },
  {
    id: 'oportunistico' as const,
    rotulo: 'Oportunístico',
    fator: 1.35,
    nota: 'Aceita margem menor na venda e mais exposição a preço.',
  },
]

// ---------------------------------------------------------------------------
// Matriz de decisão Make / Buy / Sell
// ---------------------------------------------------------------------------

/** Sinais de contexto que não vêm dos sliders, mas do cenário do Hub. */
export interface ContextoMercado {
  /** Probabilidade de alta do trigo em 15 dias (%). */
  probAlta15dPct: number
  /** O blend disponível atende a especificação da farinha escolhida. */
  qualidadeAtendeEspec: boolean
  /** Cobertura de estoque acima da política (dias em excesso; 0 = sem excesso). */
  excessoEstoqueDias: number
}

/** Contexto do cenário-âncora, para a matriz apontar a linha certa na abertura. */
export const CONTEXTO_CENARIO: ContextoMercado = {
  probAlta15dPct: PRECOS_ATUAIS.probAltaTrigo15dPct,
  qualidadeAtendeEspec: true,
  excessoEstoqueDias: 0,
}

export interface LinhaMatrizMbs {
  id: string
  /** A situação, como o negócio a descreve. */
  situacao: string
  /** A decisão recomendada para a situação. */
  decisao: string
  /** Alternativa correspondente, quando há uma direta. */
  alternativa?: AlternativaMbs
  /** Por que a regra vale — o "porquê" que a tela mostra. */
  porque: string
}

export interface LinhaMatrizAvaliada extends LinhaMatrizMbs {
  /** A situação está acontecendo no cenário simulado agora. */
  ativa: boolean
  /** Evidência numérica de por que está (ou não está) ativa. */
  evidencia: string
}

const brlT = (v: number) => `R$ ${v.toFixed(1).replace('.', ',')}/t`
const tonT = (v: number) => `${Math.round(v).toLocaleString('pt-BR')} t`

/**
 * As 10 situações da tese v2. A linha ATIVA é decidida por predicado sobre os
 * inputs simulados — não por seleção manual —, então mexer num slider move o
 * destaque e o usuário vê a regra que passou a valer.
 */
export function matrizDecisao(
  resultado: ResultadoSimuladorMbs,
  contexto: ContextoMercado = CONTEXTO_CENARIO,
): LinhaMatrizAvaliada[] {
  const { inputs, custos, alocacao } = resultado
  const interno = custos.custoInternoRsT
  const externo = inputs.precoExternoRsT
  const demandaAlta = inputs.demandaT >= inputs.capacidadeT * 0.8
  const restrita = alocacao.capacidadeRestrita
  const ociosaT = alocacao.fatias.find((f) => f.chave === 'ociosa')?.toneladas ?? 0
  const vendendoT = alocacao.fatias.find((f) => f.chave === 'produzir-vender')?.toneladas ?? 0
  const sobraT = Math.max(0, inputs.capacidadeT - Math.min(inputs.capacidadeT, inputs.demandaT))
  const vendaLiquida = inputs.precoVendaRsT - inputs.custoServirRsT
  const margemMinimaOk = alocacao.margemVendaEfetivaRsT >= inputs.margemMinimaRsT

  const linhas: Array<LinhaMatrizAvaliada> = [
    {
      id: 'interno-menor-demanda-alta',
      situacao: 'Custo interno abaixo do externo e demanda alta',
      decisao: 'Produzir e consumir',
      alternativa: 'produzir-consumir',
      porque: 'Cada tonelada moída evita uma compra mais cara e mantém o controle do blend.',
      ativa: interno < externo && demandaAlta,
      evidencia: `interno ${brlT(interno)} vs externo ${brlT(externo)} · demanda ${tonT(inputs.demandaT)} de ${tonT(inputs.capacidadeT)} de capacidade`,
    },
    {
      id: 'interno-maior',
      situacao: 'Custo interno acima do externo',
      decisao: 'Avaliar compra e reduzir moagem',
      alternativa: 'comprar',
      porque:
        'Moer destrói valor a esse custo. Antes de reduzir, checar o custo evitável: a depreciação não some ao comprar de fora.',
      ativa: interno > externo,
      evidencia: `interno ${brlT(interno)} vs externo ${brlT(externo)} · evitável ${brlT(custos.custoEvitavelRsT)}`,
    },
    {
      id: 'venda-supera-consumo',
      situacao: 'Preço de venda supera o valor do consumo interno',
      decisao: 'Vender e recomprar para as fábricas',
      alternativa: 'produzir-vender',
      porque:
        'Se a venda líquida paga mais que o preço de repor a farinha, a tonelada vale mais no mercado do que na própria fábrica.',
      ativa: vendaLiquida > externo,
      evidencia: `venda líquida ${brlT(vendaLiquida)} vs reposição ${brlT(externo)}`,
    },
    {
      id: 'ociosa-acima-marginal',
      situacao: 'Capacidade ociosa e preço acima do custo marginal',
      decisao: 'Produzir incremental para venda',
      alternativa: 'produzir-vender',
      porque:
        'Com fixos já absorvidos, toda tonelada vendida acima do custo marginal (mais o custo de servir) é margem incremental.',
      ativa: !restrita && sobraT > 0 && vendaLiquida > custos.custoMarginalRsT && margemMinimaOk,
      evidencia: restrita
        ? `sem capacidade ociosa: a demanda já consome as ${tonT(inputs.capacidadeT)} disponíveis`
        : `folga ${tonT(sobraT)} · venda líquida ${brlT(vendaLiquida)} vs marginal ${brlT(custos.custoMarginalRsT)}`,
    },
    {
      id: 'restrita-demanda-alta',
      situacao: 'Capacidade restrita e demanda alta',
      decisao: 'Priorizar o consumo interno',
      alternativa: 'produzir-consumir',
      porque:
        'Sem capacidade para os dois, a farinha própria vai para as fábricas: qualidade constante e suprimento garantido valem mais que o spread do spot.',
      ativa: restrita && !margemMinimaOk,
      evidencia: restrita
        ? `capacidade ${tonT(inputs.capacidadeT)} < demanda ${tonT(inputs.demandaT)} · faltam ${tonT(inputs.demandaT - inputs.capacidadeT)}`
        : `capacidade ${tonT(inputs.capacidadeT)} cobre a demanda de ${tonT(inputs.demandaT)} · folga de ${tonT(sobraT)}`,
    },
    {
      id: 'restrita-margem-acima-reposicao',
      situacao: 'Capacidade restrita, mas margem externa acima do custo de reposição',
      decisao: 'Vender e comprar parte da farinha',
      alternativa: 'produzir-vender',
      porque:
        'Vender obriga a repor comprando. Só compensa quando a venda líquida bate o preço de reposição — aí o spread paga a troca.',
      ativa: restrita && margemMinimaOk,
      evidencia: restrita
        ? `reposição ${brlT(externo)} · margem efetiva ${brlT(alocacao.margemVendaEfetivaRsT)} · mínima ${brlT(inputs.margemMinimaRsT)}`
        : `sem capacidade restrita: a venda não desloca consumo próprio e é medida contra o custo marginal`,
    },
    {
      id: 'qualidade-inadequada',
      situacao: 'Trigo com qualidade fora da especificação',
      decisao: 'Direcionar para outra farinha ou segmento',
      porque:
        'Forçar spec com trigo inadequado gera retrabalho e devolução: sai mais caro que redirecionar o lote para uma aplicação de W menor.',
      ativa: !contexto.qualidadeAtendeEspec,
      evidencia: contexto.qualidadeAtendeEspec
        ? 'blend do cenário atende a especificação da spec selecionada'
        : 'blend disponível não atende a especificação',
    },
    {
      id: 'excesso-estoque',
      situacao: 'Excesso de estoque de farinha',
      decisao: 'Acelerar venda ou reformular blend',
      alternativa: 'produzir-vender',
      porque:
        'Farinha parada perde qualidade e custa carrego; o valor recuperável cai mais rápido que o preço de mercado.',
      ativa: contexto.excessoEstoqueDias > 0,
      evidencia:
        contexto.excessoEstoqueDias > 0
          ? `${contexto.excessoEstoqueDias} dias acima da política`
          : 'cobertura dentro da política no cenário atual',
    },
    {
      id: 'mercado-alta',
      situacao: 'Mercado de trigo em alta',
      decisao: 'Simular estoque e venda futura',
      alternativa: 'estoque',
      porque:
        'Com expectativa de alta acima do carrego, antecipar moagem trava custo — é a mesma lógica da antecipação de compra do elo do trigo.',
      ativa: contexto.probAlta15dPct >= 60,
      evidencia: `probabilidade de alta em 15 dias: ${contexto.probAlta15dPct}%`,
    },
    {
      id: 'mercado-queda',
      situacao: 'Mercado de trigo em queda',
      decisao: 'Reduzir estoque e produzir sob demanda',
      porque:
        'Estoque em mercado caindo acumula perda dupla: carrego mais desvalorização do que já está moído.',
      ativa: contexto.probAlta15dPct < 40,
      evidencia: `probabilidade de alta em 15 dias: ${contexto.probAlta15dPct}%`,
    },
  ]

  return linhas.map((l) => ({
    ...l,
    evidencia:
      l.id === 'ociosa-acima-marginal' && vendendoT > 0
        ? `${l.evidencia} · alocando ${tonT(vendendoT)}`
        : l.id === 'restrita-demanda-alta' && ociosaT > 0
          ? `${l.evidencia} · ${tonT(ociosaT)} parados`
          : l.evidencia,
  }))
}
