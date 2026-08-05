/**
 * useLiveData — envelope do react-query com a REGRA DE FALLBACK do produto:
 * se o modo é "Cenário" OU o fetch falhou/expirou, o valor vem do snapshot
 * encenado (isLive=false, source='cenario'). A decisão nunca depende da rede.
 */
import { useEffect } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useDataMode } from './dataMode'
import { useLive } from './liveStore'
import { registrarAtualizacao, type FeedId } from './telemetry'
import { fetchFxLatest, fetchFxSeries, type FxLatest, type PontoFx } from './providers/fx'
import { fetchWeather, ZONA_NUCLEO_ROSARIO, type Clima } from './providers/weather'
import { fetchNews, filtrarRelevantes, type Noticia } from './providers/news'
import { fetchWheatRef, type WheatRef } from './providers/wheatRef'
import { avaliarRiscoClimatico, REGIOES_TRIGO, type RegiaoTrigo, type RiscoClimatico } from './wheatRegions'
import { snapshot, type ClimaRegiaoCenario } from '../data'

export interface SinalAoVivo<T> {
  value: T
  /** 'frankfurter' | 'open-meteo' | 'hub' | 'cenario'. */
  source: string
  /** Epoch ms da última resposta boa (null quando encenado). */
  updatedAt: number | null
  isLive: boolean
  isLoading: boolean
  /** true = modo Ao vivo tentou e a busca falhou (rede/limite) — card ERRO em /sinais. */
  falhou: boolean
}

export interface OpcoesSinal<T> {
  chave: readonly string[]
  buscar: () => Promise<T | null>
  /** Valor encenado do snapshot — usado em modo Cenário e em qualquer falha. */
  fallback: T
  fonteAoVivo: string
  /** Intervalo de refetch (default 60s — FX/clima). */
  refetchMs?: number
  /** Feed da telemetria (/sinais) — registra frescor na régua e eventos. */
  feed?: FeedId
  /** Linha da timeline quando chega dado novo (null = só marca a régua). */
  resumoEvento?: (valor: T, anterior: T | undefined) => string | null
}

export function useLiveData<T>({
  chave,
  buscar,
  fallback,
  fonteAoVivo,
  refetchMs = 60_000,
  feed,
  resumoEvento,
}: OpcoesSinal<T>): SinalAoVivo<T> {
  const aoVivo = useDataMode() === 'aovivo'
  const consulta = useQuery({
    queryKey: chave,
    queryFn: buscar,
    enabled: aoVivo,
    refetchInterval: refetchMs,
    staleTime: refetchMs,
    retry: 1,
  })

  const temDadoAoVivo = aoVivo && consulta.data != null

  // Telemetria (/sinais): cada dataUpdatedAt novo vira tick na régua + evento
  // na timeline. Dedupe no store — vários consumidores, um registro só.
  const { data, dataUpdatedAt } = consulta
  useEffect(() => {
    if (!feed || !temDadoAoVivo || data == null) return
    registrarAtualizacao(feed, dataUpdatedAt, data, (anterior) =>
      resumoEvento ? resumoEvento(data as T, anterior as T | undefined) : null,
    )
  }, [feed, temDadoAoVivo, data, dataUpdatedAt, resumoEvento])

  return {
    value: temDadoAoVivo ? (consulta.data as T) : fallback,
    source: temDadoAoVivo ? fonteAoVivo : 'cenario',
    updatedAt: temDadoAoVivo ? consulta.dataUpdatedAt : null,
    isLive: temDadoAoVivo,
    isLoading: aoVivo && consulta.isLoading,
    falhou: aoVivo && !consulta.isLoading && consulta.data == null,
  }
}

/** Frequências de refetch por feed — exportadas para a tela /sinais (countdown). */
export const REFETCH_FX_MS = 60_000
export const REFETCH_FX_SERIE_MS = 5 * 60_000
export const REFETCH_NOTICIAS_MS = 5 * 60_000
export const REFETCH_WHEAT_MS = 6 * 60 * 60 * 1000

const fmt3 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

const resumoFx = (v: FxLatest, a: FxLatest | undefined): string =>
  a == null
    ? `câmbio conectado — R$ ${fmt3(v.taxa)} (BCE ${v.data})`
    : a.taxa !== v.taxa
      ? `câmbio atualizado R$ ${fmt3(a.taxa)} → ${fmt3(v.taxa)}`
      : `câmbio confirmado R$ ${fmt3(v.taxa)}`

/** Câmbio USD/BRL — Frankfurter (fallback: R$ 5,20 do cenário). */
export function useFxAoVivo(): SinalAoVivo<FxLatest> {
  return useLiveData<FxLatest>({
    chave: ['fx', 'latest'],
    buscar: fetchFxLatest,
    fallback: { taxa: snapshot.mercado.precos.cambioBrlUsd, data: snapshot.agora.slice(0, 10) },
    fonteAoVivo: 'frankfurter',
    refetchMs: REFETCH_FX_MS,
    feed: 'cambio',
    resumoEvento: resumoFx,
  })
}

/** Higiene de rate-limit: clima muda por hora, não por minuto — 5 min de polling
 * mantém as 5 consultas Open-Meteo em ~1,4k req/dia (limite gratuito: 10k). */
export const CLIMA_REFETCH_MS = 5 * 60_000

/** Clima na zona núcleo (Rosário/AR) — Open-Meteo (fallback: seca do cenário). */
export function useClimaAoVivo(): SinalAoVivo<Clima> {
  return useLiveData<Clima>({
    chave: ['clima', 'rosario'],
    buscar: () => fetchWeather(ZONA_NUCLEO_ROSARIO.lat, ZONA_NUCLEO_ROSARIO.lon),
    fallback: snapshot.mercado.clima,
    fonteAoVivo: 'open-meteo',
    refetchMs: CLIMA_REFETCH_MS,
  })
}

/**
 * Série USD/BRL (~90 dias) — pulse, sparklines e gráfico da Previsão.
 * Default único de 90d: TODOS os consumidores compartilham a MESMA queryKey
 * (um único ciclo de refetch global — nenhuma busca duplicada por tela).
 */
export function useFxSerieAoVivo(dias = 90): SinalAoVivo<PontoFx[]> {
  return useLiveData<PontoFx[]>({
    chave: ['fx', 'serie', String(dias)],
    buscar: () => fetchFxSeries(dias),
    fallback: snapshot.previsao.cambio.historico.map((p) => ({ data: p.data, taxa: p.valor })),
    fonteAoVivo: 'frankfurter',
    refetchMs: REFETCH_FX_SERIE_MS,
  })
}

/**
 * Frescor relativo ("há 12s") de um updatedAt — re-renderiza com o tick
 * global de 1s da camada simulada (nenhum timer novo).
 */
export function useFrescorRelativo(updatedAt: number | null): string | null {
  useLive((s) => s.segundos)
  if (updatedAt == null) return null
  const s = Math.max(0, Math.round((Date.now() - updatedAt) / 1000))
  return s < 90 ? `há ${s}s` : `há ${Math.round(s / 60)}min`
}

export interface ClimaRegiaoSinal {
  regiao: RegiaoTrigo
  /** Clima real (null quando encenado). */
  clima: Clima | null
  /** Fallback encenado da região (sempre presente). */
  cenario: ClimaRegiaoCenario
  risco: RiscoClimatico
  isLive: boolean
  updatedAt: number | null
  isLoading: boolean
}

/**
 * Clima real das 4 regiões de trigo (useQueries — uma consulta por região).
 * Ao vivo: anomalia → risco por limiar. Cenário/falha: sinal encenado da região.
 */
export function useClimaRegioesAoVivo(): ClimaRegiaoSinal[] {
  const aoVivo = useDataMode() === 'aovivo'
  const consultas = useQueries({
    queries: REGIOES_TRIGO.map((r) => ({
      queryKey: ['clima', 'regiao', r.id],
      queryFn: () => fetchWeather(r.lat, r.lon),
      enabled: aoVivo,
      refetchInterval: CLIMA_REFETCH_MS,
      staleTime: CLIMA_REFETCH_MS,
      retry: 1,
    })),
  })

  // Telemetria (/sinais): o lote de regiões vivas marca a régua e a timeline
  const vivas = consultas.filter((c) => c.data != null).length
  const maisRecente = Math.max(0, ...consultas.map((c) => (c.data != null ? c.dataUpdatedAt : 0)))
  useEffect(() => {
    if (!aoVivo || vivas === 0 || maisRecente === 0) return
    const regioesTexto = vivas === 1 ? '1 região' : `${vivas} regiões`
    registrarAtualizacao('clima', maisRecente, vivas, (anterior) =>
      anterior == null
        ? `clima conectado — ${regioesTexto} de trigo (Open-Meteo, previsão 16d)`
        : `clima atualizado — ${regioesTexto} de trigo`,
    )
  }, [aoVivo, vivas, maisRecente])

  return REGIOES_TRIGO.map((regiao, i) => {
    const consulta = consultas[i]
    const cenario = snapshot.mercado.climaRegioes.find((c) => c.regiaoId === regiao.id)!
    const vivo = aoVivo && consulta.data != null
    return {
      regiao,
      clima: vivo ? consulta.data! : null,
      cenario,
      risco: vivo
        ? avaliarRiscoClimatico(regiao.papel, consulta.data!)
        : { nivel: cenario.nivel, motivo: cenario.resumo },
      isLive: vivo,
      updatedAt: vivo ? consulta.dataUpdatedAt : null,
      isLoading: aoVivo && consulta.isLoading,
    }
  })
}

/**
 * Manchetes de trigo/geopolítica (GDELT, filtradas por relevância).
 * Fallback: manchetes encenadas do snapshot (mesma narrativa do cenário).
 */
const resumoNoticias = (v: Noticia[], a: Noticia[] | undefined): string => {
  if (a == null) return `${v.length} manchetes GDELT carregadas (filtro de relevância)`
  const anteriores = new Set(a.map((n) => n.titulo))
  const novas = v.filter((n) => !anteriores.has(n.titulo)).length
  return novas > 0
    ? `${novas} nova${novas === 1 ? '' : 's'} manchete${novas === 1 ? '' : 's'} GDELT`
    : `manchetes GDELT confirmadas (${v.length} relevantes)`
}

export function useNoticiasAoVivo(): SinalAoVivo<Noticia[]> {
  return useLiveData<Noticia[]>({
    chave: ['noticias', 'gdelt'],
    buscar: async () => {
      const brutas = await fetchNews()
      if (!brutas) return null
      const relevantes = filtrarRelevantes(brutas)
      return relevantes.length > 0 ? relevantes : null
    },
    fallback: snapshot.mercado.noticias.map((n) => ({ titulo: n.titulo, fonte: n.fonte, horario: n.horario })),
    fonteAoVivo: 'gdelt',
    refetchMs: REFETCH_NOTICIAS_MS,
    feed: 'noticias',
    resumoEvento: resumoNoticias,
  })
}

/** Trigo de REFERÊNCIA MENSAL — proxy /api/wheat (FRED via Alpha Vantage, cache 6h). */
export function useWheatAoVivo(): SinalAoVivo<WheatRef> {
  return useLiveData<WheatRef>({
    chave: ['wheat', 'ref'],
    buscar: fetchWheatRef,
    fallback: { precoUsdT: snapshot.mercado.precos.cbotUsdT, data: snapshot.agora.slice(0, 10), fonte: 'cenário' },
    fonteAoVivo: 'fred-av',
    refetchMs: REFETCH_WHEAT_MS,
    feed: 'trigo',
    resumoEvento: (v) =>
      `referência mensal de trigo: US$ ${Math.round(v.precoUsdT)}/t (${v.data.slice(0, 7)})${v.stale ? ' · cache' : ''}`,
  })
}
