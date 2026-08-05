/** Fetch JSON com timeout — qualquer erro (rede, HTTP, parse, abort) vira null. */
const TIMEOUT_MS = 6000

export async function fetchJson(url: string): Promise<unknown | null> {
  const controlador = new AbortController()
  const timer = setTimeout(() => controlador.abort(), TIMEOUT_MS)
  try {
    const resposta = await fetch(url, { signal: controlador.signal })
    if (!resposta.ok) return null
    return await resposta.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
