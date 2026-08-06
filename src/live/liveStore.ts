/**
 * Camada de "tempo real" SIMULADA — sem backend.
 *
 * Um único setInterval de 1s move tudo:
 *  - relógio de sessão (o "atualizado há Xs" corre; a data-base do cenário
 *    permanece Terça, 12 ago · 07:00);
 *  - a cada 3s, micro-flutuação DETERMINÍSTICA (senos sobre o índice do tick,
 *    ±0,1–0,3%) nos sinais de mercado ao vivo — os números de DECISÃO
 *    (TLC R$ 1.480, R$ 4,8M etc.) não são tocados;
 *  - a cada ~21s, um evento de baixa severidade entra no ticker;
 *  - a cada 30s, o "sync" que zera o contador de frescor.
 *
 * prefers-reduced-motion congela a flutuação (mantém o frescor correndo).
 */
import { useSyncExternalStore } from 'react'
import { PRECOS_ATUAIS } from '../data/mercado'
import { publicarChegadasAte } from '../alerts/chegadaAoVivo'

export interface PrecosLive {
  trigoUsdT: number
  cambio: number
  freteUsdT: number
}

export interface EventoLive {
  id: number
  texto: string
}

export interface LiveState {
  /** Segundos de sessão desde a montagem do app. */
  segundos: number
  /** Índice do tick de mercado (a cada 3s). */
  tick: number
  /** Segundos desde o último sync de dados (0–29). */
  atualizadoHaS: number
  precos: PrecosLive
  historico: { trigo: readonly number[]; cambio: readonly number[]; frete: readonly number[] }
  eventos: readonly EventoLive[]
  congelado: boolean
}

const BASE: PrecosLive = {
  trigoUsdT: PRECOS_ATUAIS.cbotUsdT,
  cambio: PRECOS_ATUAIS.cambioBrlUsd,
  freteUsdT: PRECOS_ATUAIS.freteArgentinaNordesteUsdT,
}

const TICK_S = 3
const EVENTO_A_CADA_TICKS = 7
const SYNC_S = 30
const HISTORICO_MAX = 24

/** Eventos de baixa severidade, coerentes com o cenário-âncora. */
const EVENTOS_ROTEIRO = [
  'Mesa: NDF 90d negociado a R$ 5,27',
  'MV Ceres Australis confirmou ETA 16 ago (Pecém)',
  'Fila de Pecém estável: 2 navios',
  'S&OP: consumo intradiário 2.980 t/dia',
  'Bolsa de Cereales mantém safra em 49,9 Mt',
  'MV Río Paraná: nova ETA 20 ago reconfirmada',
] as const

/** Flutuação suave e determinística: soma de senos sobre o índice do tick. */
const flutua = (base: number, amp: number, t: number, f1: number, f2: number, fase: number) =>
  base * (1 + amp * (0.6 * Math.sin(t / f1) + 0.4 * Math.sin(t / f2 + fase)))

function precosEm(tick: number, congelado: boolean): PrecosLive {
  if (congelado || tick === 0) return { ...BASE }
  return {
    trigoUsdT: flutua(BASE.trigoUsdT, 0.0022, tick, 2.6, 6.3, 1.7),
    cambio: flutua(BASE.cambio, 0.0013, tick, 3.4, 8.1, 0.6),
    freteUsdT: flutua(BASE.freteUsdT, 0.0028, tick, 4.2, 9.7, 2.9),
  }
}

function estadoInicial(congelado: boolean): LiveState {
  const precos = precosEm(0, congelado)
  // Semente determinística: a "cauda" do passado para as sparklines nascerem vivas
  const passado = Array.from({ length: 8 }, (_, i) => precosEm(i - 8, congelado))
  return {
    segundos: 0,
    tick: 0,
    atualizadoHaS: 0,
    precos,
    historico: {
      trigo: [...passado.map((p) => p.trigoUsdT), precos.trigoUsdT],
      cambio: [...passado.map((p) => p.cambio), precos.cambio],
      frete: [...passado.map((p) => p.freteUsdT), precos.freteUsdT],
    },
    eventos: [{ id: 0, texto: EVENTOS_ROTEIRO[0] }],
    congelado,
  }
}

const prefereMenosMovimento = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

let state: LiveState = estadoInicial(prefereMenosMovimento())
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

function emit() {
  for (const listener of listeners) listener()
}

function passo() {
  const segundos = state.segundos + 1
  let { tick, precos, historico, eventos, atualizadoHaS } = state
  atualizadoHaS = segundos % SYNC_S

  if (segundos % TICK_S === 0) {
    tick += 1
    precos = precosEm(tick, state.congelado)
    const corta = (arr: readonly number[], v: number) => [...arr.slice(-(HISTORICO_MAX - 1)), v]
    historico = {
      trigo: corta(historico.trigo, precos.trigoUsdT),
      cambio: corta(historico.cambio, precos.cambio),
      frete: corta(historico.frete, precos.freteUsdT),
    }
    if (tick % EVENTO_A_CADA_TICKS === 2) {
      const proximo = eventos.length % EVENTOS_ROTEIRO.length
      eventos = [...eventos.slice(-4), { id: eventos.length, texto: EVENTOS_ROTEIRO[proximo] }]
    }
  }

  state = { ...state, segundos, tick, atualizadoHaS, precos, historico, eventos }
  emit()

  /**
   * Chegada de alerta ao vivo. Publica no STORE DE ALERTAS, não num canal
   * próprio: é o que faz o sino, a tela de Alertas e o banner contextual
   * reagirem juntos. Fica depois do emit() para que o tick não espere a
   * notificação dos assinantes do outro store.
   */
  publicarChegadasAte(segundos)
}

/** Inicia o tick global (idempotente — um único timer para o app inteiro). */
export function iniciarLive() {
  if (timer) return
  timer = setInterval(passo, 1000)
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener?.('change', (e) => {
    state = { ...state, congelado: e.matches, precos: precosEm(e.matches ? 0 : state.tick, e.matches) }
    emit()
  })
}

export function getLiveState(): LiveState {
  return state
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Hook com seletor: componentes re-renderizam SÓ quando a fatia selecionada
 * muda (refs de precos/historico/eventos só trocam no tick de 3s; o contador
 * de frescor é um number por segundo). Nada de re-render em cascata.
 */
export function useLive<T>(selector: (s: LiveState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

export const LIVE_BASE = BASE
