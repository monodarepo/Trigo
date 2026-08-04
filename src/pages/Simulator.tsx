import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { Badge, Card, SectionTitle } from '../components/ui'
import { ScenarioCompareChart } from '../components/charts/ScenarioCompareChart'
import {
  snapshot,
  formatBRL,
  formatPct,
  formatTon,
  formatUSD,
  type OrigemId,
  type PerfilSimulacao,
  type SimuladorInputs,
} from '../data'

const { simulador, mercado, dominio, recomendacaoDoDia } = snapshot
const cambioSpot = mercado.precos.cambioBrlUsd
const cbotSpot = mercado.precos.cbotUsdT
const freteBase = mercado.precos.freteArgentinaNordesteUsdT

const origemNome = (id: string) => dominio.origens.find((o) => o.id === id)?.nome ?? id
const fmtCambio = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`
const fmtDelta = (v: number) => `${v < 0 ? '−' : '+'}${formatBRL(Math.abs(v), { compacto: true })}`
const fmtPp = (v: number) =>
  `${v < 0 ? '−' : '+'}${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.p.`

const btnPrimary =
  'rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light'
const btnGhost =
  'rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink'

/** Origens simuláveis na restrição (cadeia de fallback do motor). */
const ORIGENS_RESTRINGIVEIS: OrigemId[] = ['argentina', 'uruguai', 'russia', 'eua-golfo']

interface InputsUi {
  cambio: number
  precoUsd: number
  freteUsd: number
  quebraPct: number
  atrasoDias: number
  consumoPct: number
  restritas: OrigemId[]
}

/** Cenário-base do dia (mesmos defaults do snapshot, em valores absolutos). */
const INICIAL: InputsUi = {
  cambio: Math.round(cambioSpot * (1 + simulador.defaults.variacaoCambioPct / 100) * 100) / 100, // 5,28
  precoUsd: Math.round(cbotSpot * (1 + simulador.defaults.variacaoPrecoTrigoPct / 100) * 100) / 100, // 215,25
  freteUsd: freteBase,
  quebraPct: 0,
  atrasoDias: simulador.defaults.atrasoLogisticoDias,
  consumoPct: 0,
  restritas: [],
}

function paraEngine(ui: InputsUi): SimuladorInputs {
  return {
    variacaoPrecoTrigoPct: (ui.precoUsd / cbotSpot - 1) * 100,
    variacaoCambioPct: (ui.cambio / cambioSpot - 1) * 100,
    atrasoLogisticoDias: ui.atrasoDias,
    freteUsdT: ui.freteUsd,
    quebraSafraPct: ui.quebraPct,
    consumoPct: ui.consumoPct,
    origensRestritas: ui.restritas,
  }
}

function SliderCampo({
  rotulo,
  valor,
  valorFmt,
  hint,
  min,
  max,
  step,
  onChange,
}: {
  rotulo: string
  valor: number
  valorFmt: string
  hint?: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-ink">{rotulo}</span>
        <span className="tnums text-xs font-semibold text-gold-light">{valorFmt}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valor}
        aria-label={rotulo}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-gold"
      />
      {hint && <span className="tnums block text-[10px] text-ink-subtle">{hint}</span>}
    </label>
  )
}

const PERFIS_ORDEM: PerfilSimulacao[] = ['conservador', 'recomendado', 'oportunistico']

export default function Simulator() {
  const [ui, setUi] = useState<InputsUi>(INICIAL)
  const [cenario, setCenario] = useState(() => simulador.simular(paraEngine(INICIAL)))

  // Recalcula com debounce leve (150 ms) a cada mudança de input.
  useEffect(() => {
    const timer = setTimeout(() => setCenario(simulador.simular(paraEngine(ui))), 150)
    return () => clearTimeout(timer)
  }, [ui])

  const set = <K extends keyof InputsUi>(campo: K, valor: InputsUi[K]) =>
    setUi((atual) => ({ ...atual, [campo]: valor }))

  const alternaOrigem = (id: OrigemId) =>
    setUi((atual) => ({
      ...atual,
      restritas: atual.restritas.includes(id)
        ? atual.restritas.filter((o) => o !== id)
        : [...atual.restritas, id],
    }))

  const dadosGrafico = useMemo(
    () =>
      PERFIS_ORDEM.map((perfil) => ({
        id: perfil,
        rotulo: simulador.perfis[perfil].rotulo,
        ebitdaRs: -cenario.porPerfil[perfil].deltaVsBaselineRs,
      })),
    [cenario],
  )

  const rec = cenario.porPerfil.recomendado
  const queryAplicar = `?antecipar=${simulador.perfis.recomendado.anteciparPct}&hedge=${simulador.perfis.recomendado.hedgePct}&cambio=${ui.cambio}&preco=${ui.precoUsd}`

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Decisão"
        title="Simulador de Cenários"
        subtitle="Choques de preço, câmbio, safra e logística — impacto em CPV e EBITDA por perfil de decisão."
      />

      <div className="grid items-start gap-4 lg:grid-cols-4">
        {/* 1 · Painel de inputs */}
        <Card className="lg:sticky lg:top-20">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-ink">Cenário</h3>
            <button
              type="button"
              onClick={() => setUi(INICIAL)}
              className="flex items-center gap-1.5 rounded-full border border-edge px-3 py-1 text-[11px] font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Resetar para o cenário atual
            </button>
          </div>
          <div className="mt-4 space-y-4">
            <SliderCampo
              rotulo="Câmbio"
              valor={ui.cambio}
              valorFmt={fmtCambio(ui.cambio)}
              hint={`spot ${fmtCambio(cambioSpot)} · proj. 30d ${fmtCambio(5.28)}`}
              min={4.8}
              max={5.8}
              step={0.01}
              onChange={(v) => set('cambio', v)}
            />
            <SliderCampo
              rotulo="Preço internacional (CBOT)"
              valor={ui.precoUsd}
              valorFmt={`US$ ${Math.round(ui.precoUsd)}/t`}
              hint={`spot US$ ${cbotSpot}/t · proj. 30d US$ ${snapshot.previsao.precoTrigo.horizontes.d30.valor}/t`}
              min={180}
              max={260}
              step={1}
              onChange={(v) => set('precoUsd', v)}
            />
            <SliderCampo
              rotulo="Frete marítimo"
              valor={ui.freteUsd}
              valorFmt={`US$ ${ui.freteUsd}/t`}
              hint={`base da janela: US$ ${freteBase}/t`}
              min={12}
              max={35}
              step={1}
              onChange={(v) => set('freteUsd', v)}
            />
            <SliderCampo
              rotulo="Quebra de safra adicional"
              valor={ui.quebraPct}
              valorFmt={formatPct(ui.quebraPct)}
              hint="amplifica o choque de preço (elasticidade 0,8)"
              min={0}
              max={20}
              step={1}
              onChange={(v) => set('quebraPct', v)}
            />
            <SliderCampo
              rotulo="Atraso de navio"
              valor={ui.atrasoDias}
              valorFmt={`${ui.atrasoDias} dias`}
              hint={`cenário atual: +6 dias (${snapshot.logistica.navioAtrasado.navio})`}
              min={0}
              max={15}
              step={1}
              onChange={(v) => set('atrasoDias', v)}
            />
            <SliderCampo
              rotulo="Consumo dos moinhos"
              valor={ui.consumoPct}
              valorFmt={`${ui.consumoPct > 0 ? '+' : ''}${formatPct(ui.consumoPct)}`}
              hint={`volume do trimestre: ${formatTon(cenario.volumeTrimestreT)}`}
              min={-10}
              max={10}
              step={1}
              onChange={(v) => set('consumoPct', v)}
            />
            <div>
              <p className="text-xs font-medium text-ink">Restrição de origem</p>
              <p className="text-[10px] text-ink-subtle">indisponível na janela → cadeia de fallback</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ORIGENS_RESTRINGIVEIS.map((id) => {
                  const restrita = ui.restritas.includes(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={restrita}
                      onClick={() => alternaOrigem(id)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        restrita
                          ? 'border-danger/50 bg-danger/15 text-danger line-through'
                          : 'border-edge bg-card-2 text-ink-muted hover:border-gold/40 hover:text-ink'
                      }`}
                    >
                      {origemNome(id)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* 2 + 3 · Cenários e gráfico */}
        <div className="min-w-0 space-y-4 lg:col-span-3">
          <div className="grid gap-4 md:grid-cols-3">
            {PERFIS_ORDEM.map((perfil) => {
              const cfg = simulador.perfis[perfil]
              const out = cenario.porPerfil[perfil]
              const destaque = perfil === 'recomendado'
              return (
                <Card key={perfil} variant={destaque ? 'gold' : 'default'} padding="sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-display text-sm font-semibold ${destaque ? 'text-gold-light' : 'text-ink'}`}>
                        {cfg.rotulo}
                      </p>
                      {destaque && <Badge kind="status" label="Recomendação do dia" tone="gold" className="mt-1" />}
                    </div>
                    <Badge kind="risco" level={out.nivelRisco} />
                  </div>
                  <dl className="mt-3 space-y-1.5 border-t border-edge/60 pt-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-subtle">Antecipação</dt>
                      <dd className="tnums font-semibold text-ink">
                        {out.volumeAntecipadoT > 0
                          ? `${formatTon(out.volumeAntecipadoT)} (${formatPct(cfg.anteciparPct)})`
                          : 'sem origem disponível'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-subtle">Origem · TLC travado</dt>
                      <dd className="tnums font-semibold text-ink">
                        {out.origemAntecipadaId
                          ? `${origemNome(out.origemAntecipadaId)} · ${formatBRL(out.tlcTravadoRs)}/t`
                          : '—'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-subtle">Execução</dt>
                      <dd className="tnums font-semibold text-ink">próximos {out.janelaDias} dias</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-subtle">Hedge cambial</dt>
                      <dd className="tnums font-semibold text-ink">{formatPct(out.hedgePct)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-subtle">Exposição FX residual</dt>
                      <dd className="tnums font-semibold text-ink">
                        {formatUSD(out.exposicaoResidualUsd, { compacto: true })}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 rounded-card border border-edge/60 bg-navy/40 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-ink-subtle">Δ CPV vs baseline</span>
                      <span
                        className={`tnums font-semibold ${out.deltaVsBaselineRs <= 0 ? 'text-positive' : 'text-danger'}`}
                      >
                        {fmtDelta(out.deltaVsBaselineRs)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                      <span className="text-ink-subtle">EBITDA</span>
                      <span className="tnums font-semibold text-ink">
                        {fmtDelta(-out.deltaVsBaselineRs)} · {fmtPp(out.impactoMargemEbitdaPp)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                      <span className="text-ink-subtle">IC (P10–P90)</span>
                      <span className="tnums text-ink-muted">
                        {fmtDelta(out.intervaloConfiancaRs[0])} a {fmtDelta(out.intervaloConfiancaRs[1])}
                      </span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* 3 · Gráfico comparativo */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-semibold text-ink">Impacto no EBITDA por cenário</h3>
                <p className="tnums mt-0.5 text-xs text-ink-subtle">
                  vs baseline de {formatBRL(cenario.volumeTrimestreT * snapshot.tlc.baselineRs, { compacto: true })} no
                  trimestre · negativo = pressão de custo
                </p>
              </div>
              <Link to={`/compra${queryAplicar}`} className={btnPrimary}>
                Aplicar cenário recomendado
              </Link>
            </div>
            <div className="mt-4">
              <ScenarioCompareChart
                dados={dadosGrafico}
                ariaLabel="Comparativo do impacto no EBITDA entre os cenários conservador, recomendado e oportunístico"
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              No cenário simulado, o perfil recomendado ({formatPct(simulador.perfis.recomendado.anteciparPct)} de
              antecipação + {formatPct(simulador.perfis.recomendado.hedgePct)} de hedge) impacta o EBITDA em{' '}
              <span className="tnums font-semibold text-ink">{fmtDelta(-rec.deltaVsBaselineRs)}</span> — coerente com a
              recomendação do dia ({formatBRL(recomendacaoDoDia.impactoProtegidoRs, { compacto: true })} protegidos).{' '}
              <Link to="/previsao" className="text-gold hover:text-gold-light">
                Ver premissas de previsão
              </Link>
              .
            </p>
          </Card>

          <Card padding="sm">
            <p className="text-xs italic text-ink-subtle">
              Modelo determinístico de demonstração: passthrough de preço 75%, parcela dolarizada 87%, elasticidade de
              quebra 0,8, demurrage {formatBRL(45_000)}/dia — sem cálculo real de mercado.{' '}
              <Link to="/compra" className={`${btnGhost} ml-2 inline-block not-italic`}>
                Voltar à recomendação
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
