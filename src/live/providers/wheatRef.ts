/**
 * Provider de trigo de REFERÊNCIA MENSAL — chama o proxy serverless
 * /api/wheat (a chave Alpha Vantage/FRED vive só no servidor; cache 6h).
 * NÃO é cotação intraday CBOT — a UI rotula como "referência mensal".
 * Sem função serverless (dev/preview estático), o 404 vira null e o app
 * cai no valor-semente do snapshot (US$ 205/t) — comportamento documentado.
 */
import { fetchJson } from './fetchJson'

export interface WheatRef {
  /** Preço de referência em US$/t (mensal). */
  precoUsdT: number
  /** Mês de referência do dado (ISO). */
  data: string
  fonte: string
  /** true quando o proxy serviu o último valor conhecido (falha upstream). */
  stale?: boolean
}

interface RespostaProxy {
  valorUsdT?: number
  data?: string
  fonte?: string
  stale?: boolean
}

export async function fetchWheatRef(): Promise<WheatRef | null> {
  const json = (await fetchJson('/api/wheat', 'trigo')) as RespostaProxy | null
  if (typeof json?.valorUsdT !== 'number' || !json.data) return null
  return {
    precoUsdT: json.valorUsdT,
    data: json.data,
    fonte: json.fonte ?? 'FRED via Alpha Vantage',
    stale: json.stale === true,
  }
}
