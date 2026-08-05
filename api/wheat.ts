/**
 * /api/wheat — proxy serverless (Vercel Functions) do preço de trigo de
 * REFERÊNCIA MENSAL. Não é cotação intraday: é o preço global mensal
 * (série PWHEAMTUSDM do FRED, servida pela Alpha Vantage function=WHEAT).
 *
 * Por que proxy: a chave fica em process.env (secrets da Vercel — NUNCA no
 * cliente), sem CORS, e o cache de CDN (s-maxage=21600 + SWR) respeita o
 * limite gratuito de 25 req/dia da Alpha Vantage.
 *
 * Env (settings → Environment Variables na Vercel):
 *   ALPHAVANTAGE_KEY  — chave da Alpha Vantage (preferida), OU
 *   FRED_KEY          — chave do FRED (fallback de provedor)
 * Sem nenhuma das duas, responde `null` e o cliente cai no valor-semente
 * versionado em src/data (US$ 205/t) — o app funciona igual.
 */

interface RespostaWheat {
  valorUsdT: number
  /** Mês de referência do dado (ISO). */
  data: string
  fonte: string
  /** true quando servimos o último valor conhecido após uma falha. */
  stale?: boolean
}

interface Req {
  method?: string
}

interface Res {
  setHeader(nome: string, valor: string): void
  status(codigo: number): { json(corpo: RespostaWheat | null): void }
}

/** Último valor bom (memória do lambda quente) — base do {stale:true}. */
let ultimoConhecido: RespostaWheat | null = null

/* Orçado para caber no limite de 10s de função síncrona (Vercel/Netlify):
 * pior caso (os DOIS provedores pendurados até o abort) = 2×4s = 8s < 10s. */
const TIMEOUT_MS = 4000

async function buscarJson(url: string): Promise<unknown | null> {
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

async function daAlphaVantage(chave: string): Promise<RespostaWheat | null> {
  const json = (await buscarJson(
    `https://www.alphavantage.co/query?function=WHEAT&interval=monthly&apikey=${chave}`,
  )) as { data?: Array<{ date?: string; value?: string }> } | null
  const ponto = json?.data?.find((p) => p.date && p.value && p.value !== '.')
  const valor = ponto ? Number(ponto.value) : NaN
  if (!ponto || !Number.isFinite(valor)) return null
  return { valorUsdT: valor, data: ponto.date!, fonte: 'FRED (PWHEAMTUSDM) via Alpha Vantage' }
}

async function doFred(chave: string): Promise<RespostaWheat | null> {
  const json = (await buscarJson(
    'https://api.stlouisfed.org/fred/series/observations' +
      `?series_id=PWHEAMTUSDM&api_key=${chave}&file_type=json&sort_order=desc&limit=3`,
  )) as { observations?: Array<{ date?: string; value?: string }> } | null
  const ponto = json?.observations?.find((o) => o.date && o.value && o.value !== '.')
  const valor = ponto ? Number(ponto.value) : NaN
  if (!ponto || !Number.isFinite(valor)) return null
  return { valorUsdT: valor, data: ponto.date!, fonte: 'FRED (PWHEAMTUSDM)' }
}

export default async function handler(_req: Req, res: Res) {
  // Cache de CDN: 6h fresco + stale-while-revalidate — ~4 fetches/dia no máximo
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400')
  res.setHeader('Content-Type', 'application/json')

  const chaveAv = process.env.ALPHAVANTAGE_KEY
  const chaveFred = process.env.FRED_KEY
  if (!chaveAv && !chaveFred) {
    res.status(200).json(null)
    return
  }

  const dado = (chaveAv ? await daAlphaVantage(chaveAv) : null) ?? (chaveFred ? await doFred(chaveFred) : null)
  if (dado) {
    ultimoConhecido = dado
    res.status(200).json(dado)
    return
  }
  // Erro no provedor: 200 com o último valor conhecido marcado como stale
  if (ultimoConhecido) {
    res.status(200).json({ ...ultimoConhecido, stale: true })
    return
  }
  res.status(200).json(null)
}
