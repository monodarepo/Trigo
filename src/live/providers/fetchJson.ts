/** Fetch JSON com timeout — qualquer erro (rede, HTTP, parse, abort) vira null. */
import { registrarChamada, type FeedId } from '../telemetry'

const TIMEOUT_MS = 6000

/** `feed` opcional: registra latência/resultado na telemetria (tela /sinais). */
export async function fetchJson(url: string, feed?: FeedId): Promise<unknown | null> {
  const controlador = new AbortController()
  const timer = setTimeout(() => controlador.abort(), TIMEOUT_MS)
  const inicio = performance.now()
  const medir = (ok: boolean) => {
    if (feed) registrarChamada(feed, Math.max(1, Math.round(performance.now() - inicio)), ok)
  }
  try {
    const resposta = await fetch(url, { signal: controlador.signal })
    if (!resposta.ok) {
      medir(false)
      return null
    }
    const corpo = await resposta.json()
    medir(true)
    return corpo
  } catch {
    medir(false)
    return null
  } finally {
    clearTimeout(timer)
  }
}
