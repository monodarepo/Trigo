import type { CenarioSimulador, PerfilSimulacao, SimuladorInputs, SimuladorOutputs } from './types'
import { FINANCEIRO } from './dominio'
import { VOLUME_TRIMESTRE_T } from './compra'
import { EXPOSICAO_90D_USD } from './hedge'
import { TLC_BASELINE_RS, TLC_RECOMENDADO_RS } from './tlc'

/** Parcela do TLC sensível ao preço do trigo (FOB + prêmio). */
const PASSTHROUGH_PRECO = 0.75
/** Parcela do TLC exposta ao câmbio (custos dolarizados). */
const PARCELA_FX = 0.87
/** Custo de demurrage por dia de atraso na janela (R$). */
const DEMURRAGE_DIA_RS = 45_000

export const PERFIS_SIMULADOR: Record<
  PerfilSimulacao,
  { rotulo: string; anteciparPct: number; hedgePct: number; descricao: string }
> = {
  conservador: {
    rotulo: 'Conservador',
    anteciparPct: 8,
    hedgePct: 80,
    descricao: 'Antecipa pouco e protege quase toda a exposição — prioriza previsibilidade.',
  },
  recomendado: {
    rotulo: 'Recomendado',
    anteciparPct: 18,
    hedgePct: 60,
    descricao: 'A recomendação do dia: antecipa 18% do trimestre e protege 60% do câmbio.',
  },
  oportunistico: {
    rotulo: 'Oportunístico',
    anteciparPct: 30,
    hedgePct: 35,
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

/**
 * Modelo determinístico do trimestre (178.000 t a comprar):
 * a parcela antecipada trava TLC de R$ 1.480/t; o restante paga o baseline
 * de R$ 1.520/t ajustado pelo choque de preço (passthrough 75%) e pelo
 * câmbio na fração não protegida (87% do TLC é dolarizado).
 */
export function simularCenario(inputs: SimuladorInputs): CenarioSimulador {
  const baselineRs = VOLUME_TRIMESTRE_T * TLC_BASELINE_RS
  const porPerfil = {} as Record<PerfilSimulacao, SimuladorOutputs>

  for (const perfil of Object.keys(PERFIS_SIMULADOR) as PerfilSimulacao[]) {
    const cfg = PERFIS_SIMULADOR[perfil]
    const volAntecipado = Math.round(VOLUME_TRIMESTRE_T * (cfg.anteciparPct / 100))
    const volRestante = VOLUME_TRIMESTRE_T - volAntecipado

    const fatorPreco = 1 + (PASSTHROUGH_PRECO * inputs.variacaoPrecoTrigoPct) / 100
    const fatorCambio =
      1 + (PARCELA_FX * (1 - cfg.hedgePct / 100) * inputs.variacaoCambioPct) / 100
    const custoRestanteT = TLC_BASELINE_RS * fatorPreco * fatorCambio

    const demurrageEstimadoRs = inputs.atrasoLogisticoDias * DEMURRAGE_DIA_RS
    const custoTrimestreRs =
      volAntecipado * TLC_RECOMENDADO_RS + volRestante * custoRestanteT + demurrageEstimadoRs
    const deltaVsBaselineRs = custoTrimestreRs - baselineRs

    porPerfil[perfil] = {
      custoTrimestreRs: arred10k(custoTrimestreRs),
      deltaVsBaselineRs: arred10k(deltaVsBaselineRs),
      impactoCpvRs: arred10k(deltaVsBaselineRs),
      impactoMargemEbitdaPp:
        Math.round((-deltaVsBaselineRs / FINANCEIRO.receitaAnualRs) * 100 * 100) / 100,
      exposicaoResidualUsd: Math.round(EXPOSICAO_90D_USD * (1 - cfg.hedgePct / 100)),
      demurrageEstimadoRs,
    }
  }

  return { inputs, porPerfil }
}

/** Cenário default pré-calculado (o que a tela mostra ao abrir). */
export const CENARIO_DEFAULT: CenarioSimulador = simularCenario(SIMULADOR_DEFAULTS)
