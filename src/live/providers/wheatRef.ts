/**
 * Provider de referência de trigo — chamará o proxy /api/wheat (API-4).
 * Por ora é um stub que resolve null: o useLiveData cai no fallback do
 * cenário (CBOT US$ 205/t do snapshot) sem nenhum caminho especial.
 */

export interface WheatRef {
  /** Preço de referência em US$/t. */
  precoUsdT: number
  data: string
}

export async function fetchWheatRef(): Promise<WheatRef | null> {
  return null
}
