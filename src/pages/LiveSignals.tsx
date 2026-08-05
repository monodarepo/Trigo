import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RadioTower, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, EmptyState, Pill, SectionTitle, Sparkline } from '../components/ui'
import { AnimatedNumber } from '../components/live/AnimatedNumber'
import { BadgeFonteAoVivo } from '../components/live/LiveSourceBadge'
import { definirDataMode, useDataMode, type DataMode } from '../live/dataMode'
import { useLive } from '../live/liveStore'
import {
  CLIMA_REFETCH_MS,
  REFETCH_FX_MS,
  REFETCH_NOTICIAS_MS,
  REFETCH_WHEAT_MS,
  useClimaRegioesAoVivo,
  useFxAoVivo,
  useFxSerieAoVivo,
  useNoticiasAoVivo,
  useWheatAoVivo,
} from '../live/useLiveData'
import { registrarEvento, useTelemetria, type FeedId, type OrigemEvento } from '../live/telemetry'
import {
  snapshot,
  FONTE_FRANKFURTER,
  FONTE_GDELT,
  FONTE_OPEN_METEO,
  FONTE_WHEAT_REF,
  type FamiliaDado,
  type FonteDado,
} from '../data'

/**
 * Observabilidade da camada ao vivo (a tela da TI): estado, fonte, frescor,
 * latência e payload de cada feed. TUDO aqui é PERIFERIA — esta tela lê os
 * mesmos hooks/telemetria das outras; nenhum número de DECISÃO passa por ela.
 */

type Estado = 'live' | 'stale' | 'fallback' | 'erro'

const ESTADOS: Record<Estado, { rotulo: string; chip: string; ponto: string; pulsa: boolean }> = {
  live: {
    rotulo: 'LIVE',
    chip: 'border-positive/40 bg-positive/10 text-positive',
    ponto: 'bg-positive',
    pulsa: true,
  },
  stale: {
    rotulo: 'STALE',
    chip: 'border-warning/40 bg-warning/10 text-warning',
    ponto: 'bg-warning',
    pulsa: false,
  },
  fallback: {
    rotulo: 'CENÁRIO (DEMO)',
    chip: 'border-edge bg-card-2 text-ink-subtle',
    ponto: 'bg-ink-faint',
    pulsa: false,
  },
  erro: {
    rotulo: 'ERRO',
    chip: 'border-danger/40 bg-danger/10 text-danger',
    ponto: 'bg-danger',
    pulsa: false,
  },
}

const ROTULO_ORIGEM: Record<OrigemEvento, string> = {
  cambio: 'Câmbio',
  clima: 'Clima',
  trigo: 'Trigo',
  noticias: 'Notícias',
  sistema: 'Sistema',
}

interface FeedMeta {
  id: FeedId
  rotulo: string
  endpoint: string
  freqMs: number
  freqRotulo: string
  familia: FamiliaDado
  fonte: FonteDado
}

const FEEDS_META: FeedMeta[] = [
  { id: 'cambio', rotulo: 'Câmbio USD/BRL', endpoint: 'api.frankfurter.dev/v1/latest', freqMs: REFETCH_FX_MS, freqRotulo: '60 s', familia: 'cambio', fonte: FONTE_FRANKFURTER },
  { id: 'clima', rotulo: 'Clima — regiões de trigo', endpoint: 'api.open-meteo.com/v1/forecast', freqMs: CLIMA_REFETCH_MS, freqRotulo: '5 min', familia: 'safra', fonte: FONTE_OPEN_METEO },
  { id: 'trigo', rotulo: 'Trigo — referência mensal', endpoint: '/api/wheat (serverless)', freqMs: REFETCH_WHEAT_MS, freqRotulo: '6 h', familia: 'preco', fonte: FONTE_WHEAT_REF },
  { id: 'noticias', rotulo: 'Notícias & geopolítica', endpoint: 'api.gdeltproject.org/api/v2/doc', freqMs: REFETCH_NOTICIAS_MS, freqRotulo: '5 min', familia: 'alertas', fonte: FONTE_GDELT },
]

const fmt = (v: number, casas: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const hora = (ts: number) => new Date(ts).toLocaleTimeString('pt-BR')
const fmtDur = (s: number) =>
  s < 90 ? `${Math.max(0, Math.round(s))}s` : s < 5400 ? `${Math.round(s / 60)}min` : `${Math.round(s / 3600)}h`

function EstadoChip({ estado }: { estado: Estado }) {
  const cfg = ESTADOS[estado]
  return (
    <span
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.chip}`}
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        {cfg.pulsa && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${cfg.ponto}`} />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${cfg.ponto}`} />
      </span>
      {cfg.rotulo}
    </span>
  )
}

/** "atualizado há Xs · próximo em ~Ys" — o tick de 1s fica isolado aqui. */
function LinhaFrescor({ updatedAt, freqMs }: { updatedAt: number | null; freqMs: number }) {
  useLive((s) => s.segundos)
  if (updatedAt == null) {
    return <p className="font-mono text-11 text-ink-faint">cenário (demo) — rede desligada</p>
  }
  const haS = (Date.now() - updatedAt) / 1000
  const proximoS = Math.max(0, freqMs / 1000 - haS)
  return (
    <p className="tnums font-mono text-11 text-ink-subtle">
      atualizado há {fmtDur(haS)} · próximo em ~{fmtDur(proximoS)}
    </p>
  )
}

function Payload({ dados }: { dados: unknown }) {
  const [aberto, setAberto] = useState(false)
  let json = ''
  try {
    json = JSON.stringify(dados, null, 2)
  } catch {
    json = '— payload indisponível —'
  }
  const resumido = json.length > 1400 ? `${json.slice(0, 1400)}\n… (resumido)` : json
  return (
    <div className="mt-3 border-t border-edge/60 pt-2">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="text-11 font-semibold uppercase tracking-wide text-ink-subtle transition-colors hover:text-ink"
      >
        {aberto ? 'ocultar payload' : 'ver payload'}
      </button>
      {aberto && (
        <pre className="mt-2 max-h-56 overflow-auto rounded-card border border-edge/60 bg-base/60 p-3 font-mono text-11 leading-relaxed text-ink-muted">
          {resumido}
        </pre>
      )}
    </div>
  )
}

function CardFeed({
  meta,
  estado,
  updatedAt,
  isLive,
  payload,
  children,
}: {
  meta: FeedMeta
  estado: Estado
  updatedAt: number | null
  isLive: boolean
  payload: unknown
  children: React.ReactNode
}) {
  const tele = useTelemetria()
  const chamadas = tele.chamadas[meta.id]
  const ultima = chamadas[chamadas.length - 1]
  const latencias = chamadas.map((c) => c.latenciaMs)

  return (
    <Card data-feed={meta.id}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-ink">{meta.rotulo}</h3>
          <p className="mt-0.5 truncate font-mono text-11 text-ink-faint">
            {meta.endpoint} · a cada {meta.freqRotulo}
          </p>
        </div>
        <EstadoChip estado={estado} />
      </div>

      <div className="-ml-1.5 mt-1.5">
        <BadgeFonteAoVivo familia={meta.familia} fonte={meta.fonte} updatedAt={updatedAt} isLive={isLive} />
      </div>
      <div className="mt-1">
        <LinhaFrescor updatedAt={updatedAt} freqMs={meta.freqMs} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 border-t border-edge/60 pt-2">
        <p className="tnums font-mono text-11 text-ink-subtle">
          latência{' '}
          {ultima ? (
            <>
              <AnimatedNumber valor={ultima.latenciaMs} formatar={(v) => String(Math.round(v))} className="font-semibold text-ink" />{' '}
              ms{ultima.ok ? '' : ' (falha)'}
            </>
          ) : (
            '—'
          )}
        </p>
        {latencias.length >= 2 && (
          <Sparkline data={latencias} width={88} height={18} strokeWidth={1.5} tone={ultima?.ok ? 'info' : 'danger'} />
        )}
      </div>

      <div className="mt-3 border-t border-edge/60 pt-3">{children}</div>
      <Payload dados={payload} />
    </Card>
  )
}

/** Toggle global Ao vivo | Cenário — o MESMO estado do pulse (dataMode). */
function ToggleModo() {
  const modo = useDataMode()
  const opcao = (id: DataMode, rotulo: string) => (
    <button
      type="button"
      aria-pressed={modo === id}
      onClick={() => definirDataMode(id)}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        modo === id ? 'bg-gold text-navy' : 'text-ink-subtle hover:text-ink'
      }`}
    >
      {rotulo}
    </button>
  )
  return (
    <span
      role="group"
      aria-label="Fonte de dados externos (Sinais ao Vivo)"
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-edge bg-card-2 p-0.5"
    >
      {opcao('aovivo', 'Ao vivo')}
      {opcao('cenario', 'Cenário')}
    </span>
  )
}

/** Régua de frescor: um trilho por feed, um tick por atualização na sessão. */
function ReguaFrescor({ className = '' }: { className?: string }) {
  const tele = useTelemetria()
  const aoVivo = useDataMode() === 'aovivo'
  useLive((s) => s.segundos)
  const ultimoTick = Math.max(0, ...FEEDS_META.flatMap((f) => tele.atualizacoes[f.id]))
  // Em Cenário a régua CONGELA no último tick (nada de relógio andando)
  const fim = aoVivo ? Date.now() : ultimoTick || tele.inicioSessao + 60_000
  const inicio = tele.inicioSessao
  const span = Math.max(60_000, fim - inicio)

  return (
    <Card className={className}>
      <h3 className="font-display text-base font-semibold text-ink">Régua de frescor</h3>
      <p className="mt-0.5 text-xs text-ink-subtle">Quando cada feed atualizou ao longo da sessão.</p>
      <div className="mt-4 space-y-3">
        {FEEDS_META.map((f) => (
          <div key={f.id}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-11 font-medium uppercase tracking-wide text-ink-subtle">{ROTULO_ORIGEM[f.id]}</p>
              <p className="tnums font-mono text-11 text-ink-faint">
                {tele.atualizacoes[f.id].length === 1 ? '1 atualização' : `${tele.atualizacoes[f.id].length} atualizações`}
              </p>
            </div>
            <div
              className="relative mt-1 h-4 overflow-hidden rounded border border-edge/40 bg-navy/40"
              role="img"
              aria-label={`Atualizações do feed ${ROTULO_ORIGEM[f.id]} na sessão: ${tele.atualizacoes[f.id].length}`}
            >
              {tele.atualizacoes[f.id].map((ts) => (
                <span
                  key={ts}
                  className="absolute bottom-0.5 top-0.5 w-[3px] rounded-full bg-positive/70"
                  style={{ left: `${Math.min(98, ((ts - inicio) / span) * 97 + 1)}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="tnums mt-3 border-t border-edge/60 pt-2 font-mono text-11 text-ink-faint">
        {hora(inicio)} → {aoVivo ? hora(fim) : `${ultimoTick ? hora(ultimoTick) : '—'} · congelada (Cenário)`}
      </p>
    </Card>
  )
}

/** Linha do tempo dos ticks/atualizações da sessão (mais recente primeiro). */
function TimelineEventos({ className = '' }: { className?: string }) {
  const tele = useTelemetria()
  const eventos = [...tele.eventos].reverse()
  return (
    <Card className={className}>
      <h3 className="font-display text-base font-semibold text-ink">Linha do tempo da sessão</h3>
      <p className="mt-0.5 text-xs text-ink-subtle">Cada dado novo que chegou dos feeds, em ordem cronológica.</p>
      {eventos.length === 0 ? (
        <EmptyState
          compact
          icon={RadioTower}
          title="Sem eventos ao vivo nesta sessão"
          description='No modo Cenário (demo) a rede fica desligada — alterne para "Ao vivo" para ver os feeds chegando.'
          className="mt-4"
        />
      ) : (
        <ul className="mt-3 max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {eventos.map((e, i) => (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.24) }}
                className="flex items-baseline gap-2.5 rounded-lg border border-edge/40 bg-navy/30 px-2.5 py-1.5"
              >
                <span className="tnums shrink-0 font-mono text-11 text-ink-faint">{hora(e.ts)}</span>
                <Pill tone={e.origem === 'sistema' ? 'gold' : 'neutral'}>{ROTULO_ORIGEM[e.origem]}</Pill>
                <span className="min-w-0 truncate text-xs text-ink-muted" title={e.texto}>
                  {e.texto}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  )
}

export default function LiveSignals() {
  const modo = useDataMode()
  const aoVivo = modo === 'aovivo'
  const queryClient = useQueryClient()

  const fx = useFxAoVivo()
  const fxSerie = useFxSerieAoVivo()
  const regioes = useClimaRegioesAoVivo()
  const noticias = useNoticiasAoVivo()
  const wheat = useWheatAoVivo()

  // Estado por feed: LIVE / STALE (cache do proxy) / FALLBACK-cenário / ERRO
  const regioesVivas = regioes.filter((r) => r.isLive)
  const climaCarregando = regioes.some((r) => r.isLoading)
  const climaFalhou = aoVivo && !climaCarregando && regioesVivas.length === 0
  const climaUpdatedAt = regioesVivas.reduce<number | null>(
    (max, r) => (r.updatedAt != null && (max == null || r.updatedAt > max) ? r.updatedAt : max),
    null,
  )

  const estadoDe = (isLive: boolean, falhou: boolean, stale = false): Estado =>
    isLive ? (stale ? 'stale' : 'live') : falhou ? 'erro' : 'fallback'

  const estados: Record<FeedId, Estado> = {
    cambio: estadoDe(fx.isLive, fx.falhou),
    clima: estadoDe(regioesVivas.length > 0, climaFalhou),
    trigo: estadoDe(wheat.isLive, wheat.falhou, wheat.value.stale === true),
    noticias: estadoDe(noticias.isLive, noticias.falhou),
  }
  const vivos = Object.values(estados).filter((e) => e === 'live' || e === 'stale').length

  const atualizarAgora = () => {
    registrarEvento('sistema', 'atualização manual — todas as consultas invalidadas (react-query)')
    void queryClient.invalidateQueries()
  }

  const primeiraRegiaoViva = regioesVivas[0]

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Mercado & Sinais"
        title="Sinais ao Vivo"
        subtitle="Observabilidade dos feeds externos: estado, fonte, frescor, latência e payload — a periferia que alimenta os sinais."
      />

      {/* 1 · Cabeçalho: status geral + toggle global + atualizar agora */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Status geral</p>
            <p className="tnums mt-1 font-display text-28 font-semibold leading-none text-ink">
              {vivos} de {FEEDS_META.length} feeds ao vivo
            </p>
            <p className="mt-1 text-xs text-ink-subtle">
              {aoVivo
                ? 'Periferia ao vivo — a decisão (TLC, R$ 4,8M, blend, hedge) segue 100% encenada.'
                : 'Modo Cenário (demo): rede desligada; todos os feeds exibem o cenário-âncora das 7h.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleModo />
            <button
              type="button"
              onClick={atualizarAgora}
              disabled={!aoVivo}
              title={aoVivo ? 'Invalida as consultas do react-query e rebusca agora' : 'Disponível no modo Ao vivo'}
              className="flex items-center gap-1.5 rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={13} aria-hidden="true" />
              Atualizar agora
            </button>
          </div>
        </div>
      </Card>

      {/* 2 · Grid de feeds */}
      <div className="grid items-start gap-4 md:grid-cols-2">
        <CardFeed
          meta={FEEDS_META[0]}
          estado={estados.cambio}
          updatedAt={fx.updatedAt}
          isLive={fx.isLive}
          payload={{ latest: fx.value, serie: fxSerie.value.slice(-5) }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="tnums font-display text-20 font-semibold text-ink">
              R$ <AnimatedNumber valor={fx.value.taxa} formatar={(v) => fmt(v, 3)} />
            </p>
            <Sparkline data={fxSerie.value.slice(-30).map((p) => p.taxa)} width={120} height={26} tone="danger" />
          </div>
          <p className="tnums mt-1 font-mono text-11 text-ink-subtle">
            fechamento BCE {fx.value.data} · série de {fxSerie.value.length} dias
          </p>
        </CardFeed>

        <CardFeed
          meta={FEEDS_META[1]}
          estado={estados.clima}
          updatedAt={climaUpdatedAt}
          isLive={regioesVivas.length > 0}
          payload={
            primeiraRegiaoViva?.clima
              ? {
                  regiao: primeiraRegiaoViva.regiao.rotulo,
                  temperaturaC: primeiraRegiaoViva.clima.temperaturaC,
                  chuva7dMm: primeiraRegiaoViva.clima.chuva7dMm,
                  previsao: primeiraRegiaoViva.clima.previsao?.slice(0, 3),
                }
              : snapshot.mercado.climaRegioes
          }
        >
          <ul className="space-y-1.5">
            {regioes.map((r) => (
              <li key={r.regiao.id} className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-xs text-ink-muted">{r.regiao.rotulo}</span>
                <span className="tnums shrink-0 font-mono text-11 text-ink-subtle">
                  {r.isLive && r.clima
                    ? `${fmt(r.clima.temperaturaC, 1)}°C · 16d ${fmt(r.clima.previsao?.reduce((s, p) => s + p.chuvaMm, 0) ?? 0, 0)} mm`
                    : `${fmt(r.cenario.tMaxC, 1)}°C máx · cenário`}
                </span>
              </li>
            ))}
          </ul>
        </CardFeed>

        <CardFeed
          meta={FEEDS_META[2]}
          estado={estados.trigo}
          updatedAt={wheat.updatedAt}
          isLive={wheat.isLive}
          payload={wheat.value}
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="tnums font-display text-20 font-semibold text-ink">
              US$ <AnimatedNumber valor={wheat.value.precoUsdT} formatar={(v) => String(Math.round(v))} />
              <span className="ml-1 text-xs font-medium text-ink-subtle">/t</span>
            </p>
            {wheat.isLive && wheat.value.stale && (
              <span className="rounded-full border border-warning/40 bg-warning/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-warning">
                cache
              </span>
            )}
          </div>
          <p className="tnums mt-1 font-mono text-11 text-ink-subtle">
            {wheat.isLive
              ? `referência FRED (${wheat.value.data.slice(0, 7)}) — mensal, não é intraday CBOT`
              : 'cenário: CBOT encenado US$ 205/t'}
          </p>
        </CardFeed>

        <CardFeed
          meta={FEEDS_META[3]}
          estado={estados.noticias}
          updatedAt={noticias.updatedAt}
          isLive={noticias.isLive}
          payload={noticias.value.slice(0, 3)}
        >
          <ul className="space-y-1.5">
            {noticias.value.slice(0, 3).map((n) => (
              <li key={n.titulo} className="flex items-baseline gap-2">
                <span className="min-w-0 truncate text-xs text-ink-muted" title={n.titulo}>
                  {n.titulo}
                </span>
                <span className="tnums shrink-0 font-mono text-11 text-ink-faint">
                  {n.fonte} ·{' '}
                  {new Date(n.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        </CardFeed>
      </div>

      {/* 3+4 · Timeline de eventos + régua de frescor */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <TimelineEventos className="lg:col-span-2" />
        <ReguaFrescor />
      </div>
    </div>
  )
}
