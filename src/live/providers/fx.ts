/**
 * Provider de câmbio — Frankfurter (ECB, sem chave, sem limite razoável).
 * Paths verificados na doc v1 (frankfurter.dev/v1):
 *   latest:  https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL
 *   série:   https://api.frankfurter.dev/v1/{início}..{fim}?base=USD&symbols=BRL
 * Todo fetch tem timeout e try/catch — erro/timeout retorna null (fallback do cenário).
 */
import { fetchJson } from './fetchJson'

const BASE_URL = 'https://api.frankfurter.dev/v1'

export interface FxLatest {
  /** USD→BRL. */
  taxa: number
  /** Data de referência do BCE (dia útil). */
  data: string
}

export interface PontoFx {
  data: string
  taxa: number
}

interface RespostaLatest {
  date?: string
  rates?: Record<string, number>
}

interface RespostaSerie {
  rates?: Record<string, Record<string, number>>
}

export async function fetchFxLatest(): Promise<FxLatest | null> {
  const json = (await fetchJson(`${BASE_URL}/latest?base=USD&symbols=BRL`, 'cambio')) as RespostaLatest | null
  const taxa = json?.rates?.BRL
  if (typeof taxa !== 'number' || !json?.date) return null
  return { taxa, data: json.date }
}

export async function fetchFxSeries(dias: number): Promise<PontoFx[] | null> {
  const fim = new Date()
  const inicio = new Date(fim.getTime() - dias * 86_400_000)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const json = (await fetchJson(
    `${BASE_URL}/${fmt(inicio)}..${fmt(fim)}?base=USD&symbols=BRL`,
    'cambio',
  )) as RespostaSerie | null
  if (!json?.rates) return null
  const pontos = Object.entries(json.rates)
    .map(([data, moedas]) => ({ data, taxa: moedas?.BRL }))
    .filter((p): p is PontoFx => typeof p.taxa === 'number')
    .sort((a, b) => a.data.localeCompare(b.data))
  return pontos.length > 0 ? pontos : null
}
