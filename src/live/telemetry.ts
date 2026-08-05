/**
 * Telemetria da camada ao vivo — observabilidade da PERIFERIA para a tela
 * /sinais: latência por chamada (fetchJson), atualizações por feed (régua de
 * frescor) e linha do tempo de eventos da sessão. Store de módulo
 * (useSyncExternalStore), alimentado pelos providers e pelos hooks.
 * Nada aqui alimenta DECISÃO — é diagnóstico, não dado de negócio.
 */
import { useSyncExternalStore } from 'react'

export type FeedId = 'cambio' | 'clima' | 'trigo' | 'noticias'
export type OrigemEvento = FeedId | 'sistema'

export interface ChamadaFeed {
  ts: number
  latenciaMs: number
  ok: boolean
}

export interface EventoSinal {
  id: number
  ts: number
  origem: OrigemEvento
  texto: string
}

export interface EstadoTelemetria {
  chamadas: Record<FeedId, readonly ChamadaFeed[]>
  /** Timestamps de dados novos por feed (dataUpdatedAt) — a régua de frescor. */
  atualizacoes: Record<FeedId, readonly number[]>
  /** Linha do tempo da sessão (mais recente por último). */
  eventos: readonly EventoSinal[]
  inicioSessao: number
}

const MAX_CHAMADAS = 24
const MAX_ATUALIZACOES = 60
const MAX_EVENTOS = 40

let estado: EstadoTelemetria = {
  chamadas: { cambio: [], clima: [], trigo: [], noticias: [] },
  atualizacoes: { cambio: [], clima: [], trigo: [], noticias: [] },
  eventos: [],
  inicioSessao: Date.now(),
}

let proximoId = 1
const ouvintes = new Set<() => void>()
const emitir = () => ouvintes.forEach((o) => o())

/** Última latência registrada por fetchJson (latência da chamada, mesmo com erro). */
export function registrarChamada(feed: FeedId, latenciaMs: number, ok: boolean): void {
  estado = {
    ...estado,
    chamadas: {
      ...estado.chamadas,
      [feed]: [...estado.chamadas[feed], { ts: Date.now(), latenciaMs, ok }].slice(-MAX_CHAMADAS),
    },
  }
  emitir()
}

// Dedupe entre múltiplos consumidores do mesmo hook: um dataUpdatedAt = um evento.
const ultimaAtualizacaoPorFeed = new Map<FeedId, number>()
const ultimoValorPorFeed = new Map<FeedId, unknown>()

/**
 * Registra a chegada de dado novo num feed (chamado pelos hooks useLiveData).
 * `fazerTexto(anterior)` produz a linha da timeline (null = só marca a régua).
 */
export function registrarAtualizacao(
  feed: FeedId,
  updatedAt: number,
  valor: unknown,
  fazerTexto: (anterior: unknown) => string | null,
): void {
  if (ultimaAtualizacaoPorFeed.get(feed) === updatedAt) return
  const anterior = ultimoValorPorFeed.get(feed)
  ultimaAtualizacaoPorFeed.set(feed, updatedAt)
  ultimoValorPorFeed.set(feed, valor)
  const texto = fazerTexto(anterior)
  estado = {
    ...estado,
    atualizacoes: {
      ...estado.atualizacoes,
      [feed]: [...estado.atualizacoes[feed], updatedAt].slice(-MAX_ATUALIZACOES),
    },
    eventos: texto
      ? [...estado.eventos, { id: proximoId++, ts: updatedAt, origem: feed, texto }].slice(-MAX_EVENTOS)
      : estado.eventos,
  }
  emitir()
}

/** Evento avulso na timeline (ex.: "atualização manual", troca de modo). */
export function registrarEvento(origem: OrigemEvento, texto: string): void {
  estado = {
    ...estado,
    eventos: [...estado.eventos, { id: proximoId++, ts: Date.now(), origem, texto }].slice(-MAX_EVENTOS),
  }
  emitir()
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

export function useTelemetria(): EstadoTelemetria {
  return useSyncExternalStore(assinar, () => estado)
}
