import type {
  CenarioSimulador,
  OrigemId,
  PerfilSimulacao,
  SimuladorInputs,
  SimuladorOutputs,
} from './types'
import { FINANCEIRO } from './dominio'
import { RECOMENDACAO_COMPRA, VOLUME_TRIMESTRE_T } from './compra'
import { EXPOSICAO_90D_USD } from './hedge'
import { PRECOS_ATUAIS } from './mercado'
import { ALTERNATIVAS_COMPRA, TLC_BASELINE_RS } from './tlc'

/** Parcela do TLC sensível ao preço do trigo (FOB + prêmio). */
const PASSTHROUGH_PRECO = 0.75
/** Parcela do TLC exposta ao câmbio (custos dolarizados). */
const PARCELA_FX = 0.87
/** Custo de demurrage por dia de atraso na janela (R$). */
const DEMURRAGE_DIA_RS = 45_000
/** Amplificação de preço por ponto de quebra de safra. */
const ELASTICIDADE_QUEBRA = 0.8

const FRETE_BASE_USD = PRECOS_ATUAIS.freteArgentinaNordesteUsdT
const CAMBIO_ATUAL = PRECOS_ATUAIS.cambioBrlUsd

/** Cadeia de fallback quando uma origem é restringida (TLCs do comparador). */
const CADEIA_FALLBACK: Array<{ origemId: OrigemId; tlcRs: number }> = (
  ['argentina', 'uruguai', 'russia', 'eua-golfo'] as OrigemId[]
).map((id) => {
  const alt = ALTERNATIVAS_COMPRA.find((a) => a.origemId === id)!
  return { origemId: id, tlcRs: alt.tlcRs }
})

export const PERFIS_SIMULADOR: Record<
  PerfilSimulacao,
  { rotulo: string; anteciparPct: number; hedgePct: number; janelaDias: number; descricao: string }
> = {
  conservador: {
    rotulo: 'Conservador',
    anteciparPct: 8,
    hedgePct: 80,
    janelaDias: 30,
    descricao: 'Antecipa pouco e protege quase toda a exposição — prioriza previsibilidade.',
  },
  recomendado: {
    rotulo: 'Recomendado',
    anteciparPct: 18,
    hedgePct: 60,
    janelaDias: RECOMENDACAO_COMPRA.janelaDias,
    descricao: 'A recomendação do dia: antecipa 18% do trimestre e protege 60% do câmbio.',
  },
  oportunistico: {
    rotulo: 'Oportunístico',
    anteciparPct: 30,
    hedgePct: 35,
    janelaDias: RECOMENDACAO_COMPRA.janelaDias,
    descricao: 'Antecipa mais volume e deixa mais câmbio aberto — melhor em alta, pior em reversão.',
  },
}

/** Defaults amarrados ao cenário-âncora: previsão de +5% no trigo (d30), +1,5% no câmbio e +6 dias do MV Río Paraná. */
export const SIMULADOR_DEFAULTS: SimuladorInputs = {
  variacaoPrecoTrigoPct: 5,
  variacaoCambioPct: 1.5,
  atrasoLogisticoDias: 6,
}

const arred10k = (valor: number) => Math.round(valor / 10_000) * 10_000
const arred500t = (valor: number) => Math.round(valor / 500) * 500

/**
 * Modelo determinístico do trimestre: a parcela antecipada trava o TLC da
 * origem disponível (cadeia de fallback sob restrição); o restante paga o
 * baseline ajustado por preço (passthrough 75% + quebra de safra), câmbio na
 * fração não protegida (87% do TLC é dolarizado) e frete da janela.
 */
export function simularCenario(inputs: SimuladorInputs): CenarioSimulador {
  const frete = inputs.freteUsdT ?? FRETE_BASE_USD
  const quebra = inputs.quebraSafraPct ?? 0
  const consumo = inputs.consumoPct ?? 0
  const restritas = inputs.origensRestritas ?? []

  const volumeTrimestreT = Math.round(VOLUME_TRIMESTRE_T * (1 + consumo / 100))
  const precoPctEfetivo = inputs.variacaoPrecoTrigoPct + ELASTICIDADE_QUEBRA * quebra
  const origemDisponivel = CADEIA_FALLBACK.find((o) => !restritas.includes(o.origemId)) ?? null
  const tlcTravadoRs = origemDisponivel?.tlcRs ?? TLC_BASELINE_RS
  const deltaFreteRs = (frete - FRETE_BASE_USD) * CAMBIO_ATUAL

  const baselineRs = volumeTrimestreT * TLC_BASELINE_RS
  const porPerfil = {} as Record<PerfilSimulacao, SimuladorOutputs>

  for (const perfil of Object.keys(PERFIS_SIMULADOR) as PerfilSimulacao[]) {
    const cfg = PERFIS_SIMULADOR[perfil]
    const volumeAntecipadoT = origemDisponivel
      ? arred500t(volumeTrimestreT * (cfg.anteciparPct / 100))
      : 0
    const volumeRestanteT = volumeTrimestreT - volumeAntecipadoT

    const fatorPreco = 1 + (PASSTHROUGH_PRECO * precoPctEfetivo) / 100
    const fatorCambio = 1 + (PARCELA_FX * (1 - cfg.hedgePct / 100) * inputs.variacaoCambioPct) / 100
    const custoRestanteT = TLC_BASELINE_RS * fatorPreco * fatorCambio + deltaFreteRs

    const demurrageEstimadoRs = inputs.atrasoLogisticoDias * DEMURRAGE_DIA_RS
    const custoTrimestreRs =
      volumeAntecipadoT * tlcTravadoRs + volumeRestanteT * custoRestanteT + demurrageEstimadoRs
    const deltaVsBaselineRs = custoTrimestreRs - baselineRs

    // Incerteza cresce com a fração não travada e não protegida.
    const fatorAberto = (1 - cfg.anteciparPct / 100) * (1 - cfg.hedgePct / 100)
    const incertezaRs = arred10k(volumeTrimestreT * TLC_BASELINE_RS * 0.03 * fatorAberto)

    const nivelRisco: SimuladorOutputs['nivelRisco'] = !origemDisponivel
      ? 'alto'
      : cfg.hedgePct < 50
        ? 'alto'
        : cfg.hedgePct < 70
          ? 'medio'
          : 'baixo'

    porPerfil[perfil] = {
      custoTrimestreRs: arred10k(custoTrimestreRs),
      deltaVsBaselineRs: arred10k(deltaVsBaselineRs),
      impactoCpvRs: arred10k(deltaVsBaselineRs),
      impactoMargemEbitdaPp:
        Math.round((-deltaVsBaselineRs / FINANCEIRO.receitaAnualRs) * 100 * 100) / 100,
      exposicaoResidualUsd: Math.round(EXPOSICAO_90D_USD * (1 - cfg.hedgePct / 100)),
      demurrageEstimadoRs,
      volumeAntecipadoT,
      volumeRestanteT,
      origemAntecipadaId: origemDisponivel?.origemId ?? null,
      tlcTravadoRs,
      hedgePct: cfg.hedgePct,
      janelaDias: cfg.janelaDias,
      intervaloConfiancaRs: [
        arred10k(deltaVsBaselineRs - incertezaRs),
        arred10k(deltaVsBaselineRs + incertezaRs),
      ],
      nivelRisco,
    }
  }

  return { inputs, volumeTrimestreT, porPerfil }
}

/** Cenário default pré-calculado (o que a tela mostra ao abrir). */
export const CENARIO_DEFAULT: CenarioSimulador = simularCenario(SIMULADOR_DEFAULTS)
