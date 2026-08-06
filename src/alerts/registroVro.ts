/**
 * TRILHA DO ALERTA ATÉ O VALOR — o que foi TRATADO nesta sessão.
 *
 * Fecha o laço que o produto promete: um alerta não termina em "lido", termina
 * numa decisão com dono, hora e número. Cada resolução/atribuição/adiamento
 * feito no drawer entra aqui, e o VRO mostra a lista.
 *
 * REGRA DE HONESTIDADE (a mesma do § POC no CLAUDE.md): isto é valor
 * ENDEREÇADO, não capturado. Resolver um alerta de R$ 560 mil de demurrage não
 * põe R$ 560 mil no YTD — põe uma decisão na mesa, que só vira captura quando
 * medida. Por isso o total desta trilha aparece separado dos KPIs de captura e
 * nunca soma neles.
 */
import { useSyncExternalStore } from 'react'
import type { Alerta } from '../data/types'

export type AcaoRegistrada = 'resolvido' | 'reconhecido' | 'adiado' | 'atribuido' | 'encaminhado' | 'reaberto'

export interface LinhaRegistro {
  alertaId: string
  titulo: string
  acao: AcaoRegistrada
  /** Magnitude do impacto (R$) — ausente quando o alerta não tem número. */
  impactoRs?: number
  tipo?: Alerta['tipo']
  /** Base do impacto: sem ela, mês e trimestre somariam no mesmo total. */
  impactoBase?: Alerta['impactoBase']
  categoria: Alerta['categoria']
  /** Área a quem coube, quando houve atribuição. */
  area?: string
  /** Detalhe curto da ação ("até 13 ago", "Tesouraria/CFO"). */
  nota?: string
  /** Hora sobre a âncora do cenário ("07:14"). */
  horaRotulo: string
  /** Segundo da sessão — ordena sem depender de Date.now na renderização. */
  emSegundos: number
}

let trilha: readonly LinhaRegistro[] = []
const listeners = new Set<() => void>()

/**
 * Uma linha por ALERTA, não por clique: reconhecer, atribuir e depois resolver
 * o mesmo alerta é um trajeto, não três decisões — contar três inflaria a
 * trilha com o mesmo fato.
 */
export function registrar(linha: LinhaRegistro) {
  const existente = trilha.find((l) => l.alertaId === linha.alertaId)
  trilha = existente
    ? trilha.map((l) => (l.alertaId === linha.alertaId ? { ...linha } : l))
    : [...trilha, linha]
  for (const l of listeners) l()
}

export function limparRegistro() {
  if (trilha.length === 0) return
  trilha = []
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useRegistroVro(): readonly LinhaRegistro[] {
  return useSyncExternalStore(
    subscribe,
    () => trilha,
    () => trilha,
  )
}

/**
 * Total endereçado no MÊS. Só entram as linhas de base mensal e já resolvidas:
 * um adiamento não endereça nada (só empurra), e somar um desvio trimestral a
 * custos mensais daria um número que não é nem mês nem trimestre.
 */
export function totalEnderecadoRs(linhas: readonly LinhaRegistro[]): {
  mensalRs: number
  trimestralRs: number
  porEventoRs: number
} {
  let mensalRs = 0
  let trimestralRs = 0
  let porEventoRs = 0
  for (const l of linhas) {
    if (l.acao !== 'resolvido' || l.impactoRs == null) continue
    if (l.impactoBase === 'mes') mensalRs += l.impactoRs
    else if (l.impactoBase === 'trimestre') trimestralRs += l.impactoRs
    else porEventoRs += l.impactoRs
  }
  return { mensalRs, trimestralRs, porEventoRs }
}

export const ROTULO_ACAO: Record<AcaoRegistrada, string> = {
  resolvido: 'Resolvido',
  reconhecido: 'Reconhecido',
  adiado: 'Adiado',
  atribuido: 'Atribuído',
  encaminhado: 'Encaminhado à tela de ação',
  reaberto: 'Reaberto',
}
