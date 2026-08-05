/**
 * Provider de clima — Open-Meteo (sem chave; dados sob licença CC BY 4.0).
 *   atual+previsão: https://api.open-meteo.com/v1/forecast (16 dias)
 *   histórico:      https://archive-api.open-meteo.com/v1/archive
 * Erro/timeout retorna null (fallback do cenário).
 */
import { fetchJson } from './fetchJson'

/** Zona núcleo do trigo argentino — âncora da narrativa de safra. */
export const ZONA_NUCLEO_ROSARIO = { lat: -32.95, lon: -60.64, rotulo: 'Rosário (AR) — zona núcleo' }

export interface PrevisaoDia {
  data: string
  chuvaMm: number
  tMaxC: number
  tMinC: number
}

export interface Clima {
  temperaturaC: number
  precipitacaoMm: number
  /** WMO weather code (0 = céu limpo). */
  codigoTempo: number
  /** Chuva acumulada nos últimos 7 dias (mm) — sinal de seca. */
  chuva7dMm: number | null
  horario: string
  /** Previsão diária de 16 dias (presente só no dado ao vivo). */
  previsao?: PrevisaoDia[]
}

export interface PontoChuva {
  data: string
  chuvaMm: number
}

interface RespostaForecast {
  current?: { time?: string; temperature_2m?: number; precipitation?: number; weather_code?: number }
  daily?: {
    time?: string[]
    precipitation_sum?: Array<number | null>
    temperature_2m_max?: Array<number | null>
    temperature_2m_min?: Array<number | null>
  }
}

interface RespostaArchive {
  daily?: { time?: string[]; precipitation_sum?: Array<number | null> }
}

/** Atual + 7 dias passados (chuva acumulada) + previsão de 16 dias. */
export async function fetchWeather(lat: number, lon: number): Promise<Clima | null> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,precipitation,weather_code' +
    '&daily=precipitation_sum,temperature_2m_max,temperature_2m_min' +
    '&past_days=7&forecast_days=16&timezone=auto'
  const json = (await fetchJson(url)) as RespostaForecast | null
  const atual = json?.current
  if (typeof atual?.temperature_2m !== 'number') return null

  const hoje = (atual.time ?? '').slice(0, 10)
  const datas = json?.daily?.time ?? []
  const chuvas = json?.daily?.precipitation_sum ?? []
  const tMax = json?.daily?.temperature_2m_max ?? []
  const tMin = json?.daily?.temperature_2m_min ?? []

  // Split por data: antes de hoje = acumulado (seca); de hoje em diante = previsão
  const passadas = datas.filter((d) => d < hoje)
  const chuva7d = passadas
    .slice(-7)
    .reduce<number | null>((s, d) => (s == null ? null : s + (chuvas[datas.indexOf(d)] ?? 0)), 0)
  const previsao: PrevisaoDia[] = datas
    .map((data, i) => ({ data, chuvaMm: chuvas[i] ?? 0, tMaxC: tMax[i] ?? 0, tMinC: tMin[i] ?? 0 }))
    .filter((p) => p.data >= hoje)
    .slice(0, 16)

  return {
    temperaturaC: atual.temperature_2m,
    precipitacaoMm: atual.precipitation ?? 0,
    codigoTempo: atual.weather_code ?? 0,
    chuva7dMm: passadas.length > 0 ? chuva7d : null,
    horario: atual.time ?? '',
    previsao,
  }
}

/** Chuva diária histórica (mm) — para comparar a safra atual com a normal. */
export async function fetchWeatherHistorico(lat: number, lon: number, dias: number): Promise<PontoChuva[] | null> {
  const fim = new Date(Date.now() - 2 * 86_400_000) // arquivo tem defasagem de ~2 dias
  const inicio = new Date(fim.getTime() - dias * 86_400_000)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const url =
    'https://archive-api.open-meteo.com/v1/archive' +
    `?latitude=${lat}&longitude=${lon}` +
    `&start_date=${fmt(inicio)}&end_date=${fmt(fim)}` +
    '&daily=precipitation_sum&timezone=auto'
  const json = (await fetchJson(url)) as RespostaArchive | null
  const datas = json?.daily?.time
  const somas = json?.daily?.precipitation_sum
  if (!datas || !somas || datas.length === 0) return null
  return datas.map((data, i) => ({ data, chuvaMm: somas[i] ?? 0 }))
}
