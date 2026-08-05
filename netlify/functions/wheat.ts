/**
 * /.netlify/functions/wheat — proxy serverless (formato Netlify Functions,
 * `export handler`) do preço de trigo de REFERÊNCIA MENSAL. Não é cotação
 * intraday: é o preço global mensal (série PWHEAMTUSDM do FRED, servida pela
 * Alpha Vantage function=WHEAT). O cliente chama /api/wheat e o redirect do
 * netlify.toml aponta para cá.
 *
 * Por que proxy: a chave fica em process.env (Environment variables do site
 * no Netlify — NUNCA no cliente), sem CORS, e o cache de CDN (6h + SWR)
 * respeita o limite gratuito de 25 req/dia da Alpha Vantage.
 *
 * Env (Site configuration → Environment variables no Netlify):
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

interface HandlerResult {
  statusCode: number
  headers: Record<string, string>
  body: string
}

/** Último valor bom (memória do lambda quente) — base do {stale:true}. */
let ultimoConhecido: RespostaWheat | null = null

const TIMEOUT_MS = 8000

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

function resposta(corpo: RespostaWheat | null): HandlerResult {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      // Cache na CDN do Netlify: 6h fresco + SWR — ~4 fetches/dia no máximo
      'Netlify-CDN-Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
      'Cache-Control': 'public, max-age=3600',
    },
    body: JSON.stringify(corpo),
  }
}

export const handler = async (): Promise<HandlerResult> => {
  const chaveAv = process.env.ALPHAVANTAGE_KEY
  const chaveFred = process.env.FRED_KEY
  if (!chaveAv && !chaveFred) return resposta(null)

  const dado = (chaveAv ? await daAlphaVantage(chaveAv) : null) ?? (chaveFred ? await doFred(chaveFred) : null)
  if (dado) {
    ultimoConhecido = dado
    return resposta(dado)
  }
  // Erro no provedor: 200 com o último valor conhecido marcado como stale
  if (ultimoConhecido) return resposta({ ...ultimoConhecido, stale: true })
  return resposta(null)
}
