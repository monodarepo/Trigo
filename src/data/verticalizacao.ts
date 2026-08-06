/**
 * Elo 4 — VERTICALIZAÇÃO: quanto vale abastecer a própria fábrica em vez de
 * comprar farinha pronta.
 *
 * A conta é sempre a mesma (`ganhoVerticalizacao` no motor), mas aqui ela é
 * feita para TODOS os pares moinho × spec que as fábricas consomem, e não só
 * para o par-âncora. O resultado interessante não é a média: é a DISPERSÃO —
 * onde a farinha própria vence com folga, onde vence no limite e onde já perde.
 *
 * O ponto de virada (`precoDeIndiferencaRsT`) é o preço externo em que o ganho
 * some. Ele é mais útil que o ganho em si: diz quanto o mercado precisa cair
 * para a decisão mudar, que é a pergunta que o CFO faz depois de ver o número.
 */
import type { FarinhaId, MoinhoId, RegiaoComercial } from './types'
import { MOINHOS, regiaoDoMoinho } from './dominio'
import { getFarinha } from './farinha'
import { custoInternoFarinha, ganhoVerticalizacao } from './economics'
import { DEMANDA_FARINHA, planoPorMoinho } from './demanda'

export interface EloVerticalizacao {
  moinhoId: MoinhoId
  moinhoNome: string
  farinhaId: FarinhaId
  farinhaNome: string
  regiao: RegiaoComercial
  custoInternoRsT: number
  precoExternoRsT: number
  ganhoRsT: number
  /** Volume de farinha que a unidade destina às fábricas próprias (t/mês). */
  volumeT: number
  ganhoTotalRs: number
  /**
   * Preço externo de INDIFERENÇA (R$/t): abaixo dele, comprar passa a ser
   * melhor que moer. Como o ganho é preço − custo, o ponto de virada é o
   * próprio custo interno — e dizê-lo assim é mais honesto que apresentar uma
   * fórmula: a verticalização vale exatamente enquanto o mercado estiver acima
   * do nosso custo.
   */
  precoDeIndiferencaRsT: number
  /** Quanto o mercado precisa cair (%) para a verticalização deixar de valer. */
  folgaAteIndiferencaPct: number
  comparavel: boolean
  racional: string
}

/**
 * Quais specs cada moinho abastece. Vem do plano de demanda — o mesmo que a
 * tela de Demanda usa —, então um moinho só aparece verticalizando a farinha
 * que ele de fato produz para as fábricas.
 */
function paresAtivos(): Array<{ moinhoId: MoinhoId; farinhaId: FarinhaId; volumeT: number }> {
  const plano = planoPorMoinho()
  const pares: Array<{ moinhoId: MoinhoId; farinhaId: FarinhaId; volumeT: number }> = []

  for (const p of plano) {
    // As famílias que este moinho atende, e a farinha de cada uma.
    const familias = DEMANDA_FARINHA.filter(
      (d) => p.familias.includes(d.familia) && d.farinhaId != null,
    )
    const totalFarinhaFamilias = familias.reduce((s, d) => s + d.necessidadeFarinhaT, 0)
    if (totalFarinhaFamilias === 0) continue

    // A farinha que o moinho produz para as fábricas = trigo interno × rendimento,
    // rateado entre as specs na proporção da demanda de cada família.
    const farinhaInternaT = Math.round(
      (p.trigoInternoT * (MOINHOS.find((m) => m.id === p.moinhoId)?.rendimentoPct ?? 76)) / 100,
    )
    for (const d of familias) {
      pares.push({
        moinhoId: p.moinhoId,
        farinhaId: d.farinhaId!,
        volumeT: Math.round((farinhaInternaT * d.necessidadeFarinhaT) / totalFarinhaFamilias),
      })
    }
  }
  return pares
}

const arred1 = (v: number) => Math.round(v * 10) / 10

export const ELOS_VERTICALIZACAO: EloVerticalizacao[] = paresAtivos().map((par) => {
  const regiao = regiaoDoMoinho(par.moinhoId)
  const g = ganhoVerticalizacao(par.moinhoId, par.farinhaId, { regiao, volumeT: par.volumeT })
  const custo = custoInternoFarinha(par.moinhoId, par.farinhaId).totalRsT
  return {
    moinhoId: par.moinhoId,
    moinhoNome: MOINHOS.find((m) => m.id === par.moinhoId)?.nome ?? par.moinhoId,
    farinhaId: par.farinhaId,
    farinhaNome: getFarinha(par.farinhaId)?.nome.replace('Farinha para ', '') ?? par.farinhaId,
    regiao,
    custoInternoRsT: g.custoInternoRsT,
    precoExternoRsT: g.precoExternoRsT,
    ganhoRsT: g.ganhoRsT,
    volumeT: par.volumeT,
    ganhoTotalRs: g.ganhoTotalRs,
    precoDeIndiferencaRsT: custo,
    folgaAteIndiferencaPct: g.comparavel && g.precoExternoRsT > 0
      ? arred1(((g.precoExternoRsT - custo) / g.precoExternoRsT) * 100)
      : 0,
    comparavel: g.comparavel,
    racional: g.racional,
  }
})

/** Só os pares com cotação comparável — os demais não têm ganho a somar. */
const comparaveis = ELOS_VERTICALIZACAO.filter((e) => e.comparavel)

export interface ResumoVerticalizacao {
  /** Ganho consolidado HOJE (R$/mês): todos os pares, inclusive o que destrói. */
  ganhoTotalRs: number
  /**
   * Ganho se a decisão for tomada (R$/mês): mesmo cálculo, mas parando de
   * verticalizar onde já não vale. A diferença contra `ganhoTotalRs` é
   * exatamente o valor da decisão Make/Buy/Sell na unidade que perde.
   */
  ganhoSeAgirRs: number
  /** `ganhoSeAgirRs − ganhoTotalRs`: o que está sendo destruído por inércia. */
  destruicaoEvitavelRs: number
  /** Volume verticalizado (t de farinha/mês). */
  volumeTotalT: number
  /** Ganho médio PONDERADO pelo volume — média simples daria peso igual a um
   *  par de 500 t e a um de 12.000 t, e o número não representaria nada. */
  ganhoMedioRsT: number
  /** Pares em que a verticalização já perde para o mercado. */
  paresNegativos: number
  /** Pares sem cotação apples-to-apples — não entram na conta. */
  paresSemBase: number
  melhor: EloVerticalizacao | null
  pior: EloVerticalizacao | null
}

const volumeTotalT = comparaveis.reduce((s, e) => s + e.volumeT, 0)
const ganhoTotalRs = comparaveis.reduce((s, e) => s + e.ganhoTotalRs, 0)
const ganhoSeAgirRs = comparaveis.reduce((s, e) => s + Math.max(0, e.ganhoTotalRs), 0)

export const RESUMO_VERTICALIZACAO: ResumoVerticalizacao = {
  ganhoTotalRs,
  ganhoSeAgirRs,
  destruicaoEvitavelRs: ganhoSeAgirRs - ganhoTotalRs,
  volumeTotalT,
  ganhoMedioRsT: volumeTotalT > 0 ? arred1(ganhoTotalRs / volumeTotalT) : 0,
  paresNegativos: comparaveis.filter((e) => e.ganhoRsT < 0).length,
  paresSemBase: ELOS_VERTICALIZACAO.length - comparaveis.length,
  melhor: [...comparaveis].sort((a, b) => b.ganhoRsT - a.ganhoRsT)[0] ?? null,
  pior: [...comparaveis].sort((a, b) => a.ganhoRsT - b.ganhoRsT)[0] ?? null,
}

/**
 * Sensibilidade a uma queda no preço externo, SUPONDO QUE SE AJA: a cada nível
 * de queda, para-se de verticalizar onde deixou de valer. Por isso o ponto de
 * 0% é `ganhoSeAgirRs`, e não o ganho de hoje — a curva mede o que o hub
 * entrega, e o hub muda a decisão quando o número muda.
 *
 * A curva não é uma reta: ela quebra quando uma unidade cai abaixo do custo e
 * sai da conta. É esse degrau que mostra quais moinhos são a defesa da margem.
 */
export interface PontoSensibilidade {
  quedaPct: number
  ganhoTotalRs: number
  paresAindaPositivos: number
}

export const SENSIBILIDADE_VERTICALIZACAO: PontoSensibilidade[] = [
  0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20,
].map((quedaPct) => {
  const fator = 1 - quedaPct / 100
  const positivos = comparaveis.filter((e) => e.precoExternoRsT * fator > e.custoInternoRsT)
  return {
    quedaPct,
    ganhoTotalRs: Math.round(
      positivos.reduce((s, e) => s + (e.precoExternoRsT * fator - e.custoInternoRsT) * e.volumeT, 0),
    ),
    paresAindaPositivos: positivos.length,
  }
})

/** A queda que zera o ganho consolidado — o "até onde aguenta". */
export const QUEDA_QUE_ZERA_PCT =
  SENSIBILIDADE_VERTICALIZACAO.find((p) => p.ganhoTotalRs <= 0)?.quedaPct ?? null
