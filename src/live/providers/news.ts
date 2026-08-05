/**
 * Provider de notícias — GDELT DOC 2.0 (grátis, sem chave).
 *   https://api.gdeltproject.org/api/v2/doc/doc?query=…&mode=ArtList&format=json
 *
 * CORS: o DOC 2.0 publica Access-Control-Allow-Origin:* (uso client-side
 * documentado). Ainda assim, se o browser bloquear (proxy corporativo etc.),
 * tentamos a função serverless /api/news (mesmo padrão do /api/wheat do
 * API-4) antes de cair nas manchetes encenadas do snapshot.
 */
import { fetchJson } from './fetchJson'

export interface Noticia {
  titulo: string
  fonte: string
  /** ISO 8601. */
  horario: string
  url?: string
  idioma?: string
}

interface ArtigoGdelt {
  title?: string
  url?: string
  domain?: string
  seendate?: string
  language?: string
}

const QUERY = encodeURIComponent('(wheat OR trigo OR "Black Sea grain")')
const URL_GDELT =
  `https://api.gdeltproject.org/api/v2/doc/doc?query=${QUERY}` +
  '&mode=ArtList&format=json&maxrecords=15&sort=DateDesc'

/** "20250812T063000Z" → "2025-08-12T06:30:00Z". */
function parseSeendate(s: string | undefined): string | null {
  if (!s || s.length < 15) return null
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`
}

function parseArtigos(json: unknown): Noticia[] | null {
  const artigos = (json as { articles?: ArtigoGdelt[] } | null)?.articles
  if (!Array.isArray(artigos)) return null
  const noticias = artigos
    .map((a): Noticia | null => {
      const horario = parseSeendate(a.seendate)
      if (!a.title || !horario) return null
      return { titulo: a.title, fonte: a.domain ?? 'gdelt', horario, url: a.url, idioma: a.language }
    })
    .filter((n): n is Noticia => n != null)
  return noticias.length > 0 ? noticias : null
}

export async function fetchNews(): Promise<Noticia[] | null> {
  // 1º: direto no GDELT (CORS aberto); 2º: proxy serverless /api/news
  const direto = parseArtigos(await fetchJson(URL_GDELT, 'noticias'))
  if (direto) return direto
  return parseArtigos(await fetchJson('/api/news', 'noticias'))
}

const normaliza = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Palavras-chave com peso: tema central = 2 · contexto = 1. Corte: score ≥ 2. */
const PESOS: Array<[string, number]> = [
  ['wheat', 2],
  ['trigo', 2],
  ['grain', 2],
  ['black sea', 2],
  ['mar negro', 2],
  ['safra', 1],
  ['harvest', 1],
  ['export', 1],
  ['freight', 1],
  ['frete', 1],
  ['drought', 1],
  ['seca', 1],
  ['quota', 1],
  ['cota', 1],
  ['tariff', 1],
  ['ban', 1],
  ['cbot', 1],
  ['hrw', 1],
]

/** Filtro de relevância: score por palavra-chave + dedupe por título. */
export function filtrarRelevantes(noticias: Noticia[], maximo = 8): Noticia[] {
  const vistos = new Set<string>()
  const relevantes: Noticia[] = []
  for (const noticia of noticias) {
    const texto = normaliza(noticia.titulo)
    const score = PESOS.reduce((s, [chave, peso]) => (texto.includes(chave) ? s + peso : s), 0)
    if (score < 2) continue
    const chave = texto.replace(/[^a-z0-9 ]/g, '').slice(0, 60)
    if (vistos.has(chave)) continue
    vistos.add(chave)
    relevantes.push(noticia)
    if (relevantes.length >= maximo) break
  }
  return relevantes
}

const RISCO_GEO = ['russia', 'russia', 'ucrania', 'ukraine', 'black sea', 'mar negro', 'quota', 'cota', 'ban', 'sanc', 'tariff']

export interface RiscoGeopolitico {
  nivel: 'baixo' | 'medio' | 'alto'
  /** Manchetes de risco nas últimas 24h. */
  manchetes24h: number
}

/** Sinal de geopolítica: densidade de manchetes de risco nas últimas 24h. */
export function avaliarRiscoGeopolitico(noticias: Noticia[], agoraMs: number): RiscoGeopolitico {
  const corte = agoraMs - 24 * 60 * 60 * 1000
  const deRisco = noticias.filter((n) => {
    const texto = normaliza(n.titulo)
    return Date.parse(n.horario) >= corte && RISCO_GEO.some((chave) => texto.includes(chave))
  }).length
  return { nivel: deRisco >= 6 ? 'alto' : deRisco >= 2 ? 'medio' : 'baixo', manchetes24h: deRisco }
}
