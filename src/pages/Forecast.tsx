import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Card, ConfidenceMeter, SectionTitle, TrendArrow } from '../components/ui'
import { ForecastChart } from '../components/charts/ForecastChart'
import { SourceBadge } from '../components/trust/SourceBadge'
import { SinaisExternos } from '../components/live/ExternalSignals'
import { WeatherPanel } from '../components/live/WeatherPanel'
import { AnimatedNumber } from '../components/live/AnimatedNumber'
import { BadgeFonteAoVivo } from '../components/live/LiveSourceBadge'
import { useFxAoVivo, useFxSerieAoVivo, useWheatAoVivo } from '../live/useLiveData'
import { FONTE_FRANKFURTER, FONTE_WHEAT_REF } from '../data'
import {
  snapshot,
  formatBRL,
  formatPct,
  formatTon,
  type FatorPrevisao,
  type OrigemId,
  type PontoPrevisao,
} from '../data'

const { previsao, mercado, tlc, compra, hedge } = snapshot
const cambioAtual = mercado.precos.cambioBrlUsd

const fmtCambio = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`
const fmtTickPreco = (v: number) => Math.round(v).toLocaleString('pt-BR')
const fmtTickCambio = (v: number) => v.toFixed(2).replace('.', ',')
const chipAoVivo =
  'rounded-full border border-positive/40 bg-positive/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-positive'
const chipRefMensal =
  'rounded-full border border-warning/40 bg-warning/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-warning'

type Horizonte = 'd7' | 'd30' | 'd60' | 'd90'
type Unidade = 'usd' | 'brl'
type OrigemCurva = 'cbot' | OrigemId

const HORIZONTES: Array<{ id: Horizonte; rotulo: string; dias: number }> = [
  { id: 'd7', rotulo: '7d', dias: 7 },
  { id: 'd30', rotulo: '30d', dias: 30 },
  { id: 'd60', rotulo: '60d', dias: 60 },
  { id: 'd90', rotulo: '90d', dias: 90 },
]

const ORIGENS_CURVA: Array<{ id: OrigemCurva; rotulo: string }> = [
  { id: 'cbot', rotulo: 'CBOT' },
  ...previsao.porOrigem.map((o) => ({ id: o.origemId as OrigemCurva, rotulo: o.rotulo })),
]

const btnPrimary =
  'rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light'
const btnGhost =
  'rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink'

function Toggle<T extends string>({
  opcoes,
  valor,
  onChange,
  ariaLabel,
}: {
  opcoes: ReadonlyArray<{ id: T; rotulo: string }>
  valor: T
  onChange: (v: T) => void
  ariaLabel: string
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap rounded-full border border-edge bg-card-2 p-0.5">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === valor}
          onClick={() => onChange(o.id)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            o.id === valor ? 'bg-gold text-navy' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

const corDirecao: Record<FatorPrevisao['direcao'], { barra: string; texto: string; sinal: string }> = {
  alta: { barra: 'bg-danger', texto: 'text-danger', sinal: '+' },
  baixa: { barra: 'bg-positive', texto: 'text-positive', sinal: '−' },
  neutra: { barra: 'bg-edge', texto: 'text-ink-subtle', sinal: '' },
}

export default function Forecast() {
  const [unidade, setUnidade] = useState<Unidade>('usd')
  const [horizonte, setHorizonte] = useState<Horizonte>('d90')
  const [origem, setOrigem] = useState<OrigemCurva>('cbot')

  /**
   * ÂNCORA-E-DERIVA desta tela (periferia ao vivo, núcleo encenado):
   * · SINAL ao vivo: câmbio spot + série ~90d (Frankfurter) e a referência
   *   mensal de trigo (/api/wheat — FRED via Alpha Vantage).
   * · DERIVADO-AO-VIVO (recalcula quando o sinal muda): a ESCALA dos gráficos —
   *   trigo = cenário × (âncora mensal ÷ US$ 205), prêmios de origem intactos;
   *   câmbio = histórico real + projeção encenada re-ancorada no spot real;
   *   conversão R$/t ao câmbio vivo.
   * · CENÁRIO (nunca muda com rede): a FORMA das projeções e bandas (P10–P90),
   *   a probabilidade de alta (72%), prêmios de origem, NDF e o "E daí?"
   *   (TLC, economia, janela) — a recomendação do dia não muda por um tick.
   */
  const fx = useFxAoVivo()
  const fxSerie = useFxSerieAoVivo()
  const wheatRef = useWheatAoVivo()

  const serie = previsao.precoTrigo
  const origemSelecionada = origem === 'cbot' ? null : previsao.porOrigem.find((o) => o.origemId === origem)!

  const razaoTrigo = wheatRef.isLive ? wheatRef.value.precoUsdT / serie.valorAtual : 1
  const razaoCambio = fx.isLive ? fx.value.taxa / previsao.cambio.valorAtual : 1
  const cambioSpot = fx.isLive ? fx.value.taxa : cambioAtual

  // Conversão de unidade (R$/t = US$/t × câmbio — derivado-ao-vivo com spot real)
  const conv = useCallback(
    (v: number) => (unidade === 'brl' ? Math.round(v * cambioSpot) : v),
    [unidade, cambioSpot],
  )

  const dataLimite = serie.horizontes[horizonte].data

  // Projeção do trigo ancorada: a razão se aplica SÓ ao componente CBOT do
  // ponto — o prêmio de origem (US$ absoluto, encenado) fica intacto.
  const projecaoVisivel = useMemo(() => {
    const base = origemSelecionada ? origemSelecionada.projecao : serie.projecao
    const ancorar = (p: PontoPrevisao, cbot: PontoPrevisao): PontoPrevisao => {
      if (razaoTrigo === 1) return p
      const d = (v: number | undefined, vCbot: number | undefined) =>
        v == null || vCbot == null ? undefined : Math.round(v + vCbot * (razaoTrigo - 1))
      return {
        data: p.data,
        valor: Math.round(p.valor + cbot.valor * (razaoTrigo - 1)),
        bandaMin: d(p.bandaMin, cbot.bandaMin),
        bandaMax: d(p.bandaMax, cbot.bandaMax),
      }
    }
    return base
      .map((p, i) => {
        const a = ancorar(p, serie.projecao[i])
        return {
          data: a.data,
          valor: conv(a.valor),
          bandaMin: a.bandaMin != null ? conv(a.bandaMin) : undefined,
          bandaMax: a.bandaMax != null ? conv(a.bandaMax) : undefined,
        }
      })
      .filter((p) => p.data <= dataLimite)
  }, [origemSelecionada, serie, razaoTrigo, conv, dataLimite])

  const historicoVisivel = useMemo(
    () =>
      serie.historico.map((p) => ({
        data: p.data,
        valor: conv(razaoTrigo === 1 ? p.valor : Math.round(p.valor * razaoTrigo)),
      })),
    [serie, razaoTrigo, conv],
  )
  const pontoHorizonte = projecaoVisivel[projecaoVisivel.length - 1]

  // Câmbio: histórico REAL (Frankfurter ~90d) quando ao vivo; projeção com a
  // forma encenada re-ancorada no spot real e datas re-baseadas no hoje real.
  const historicoCambio = useMemo(() => {
    if (fxSerie.isLive) return fxSerie.value.map((p) => ({ data: p.data, valor: p.taxa }))
    return previsao.cambio.historico.filter((p) => p.data <= '2025-08-12')
  }, [fxSerie.isLive, fxSerie.value])

  const projecaoCambio = useMemo(() => {
    const base = previsao.cambio.projecao.filter((p) => p.data <= dataLimite)
    if (!fx.isLive || razaoCambio === 1) return base
    const hojeEncenado = new Date(previsao.cambio.projecao[0].data).getTime()
    const hojeReal = new Date(fx.value.data).getTime()
    const rebase = (data: string) =>
      new Date(hojeReal + (new Date(data).getTime() - hojeEncenado)).toISOString().slice(0, 10)
    const esc = (v: number | undefined) => (v == null ? undefined : Number((v * razaoCambio).toFixed(3)))
    return base.map((p) => ({ data: rebase(p.data), valor: esc(p.valor)!, bandaMin: esc(p.bandaMin), bandaMax: esc(p.bandaMax) }))
  }, [dataLimite, fx.isLive, fx.value.data, razaoCambio])

  const fmtPreco = useCallback(
    (v: number) => (unidade === 'brl' ? `${formatBRL(v)}/t` : `US$ ${Math.round(v)}/t`),
    [unidade],
  )

  const diasHorizonte = HORIZONTES.find((h) => h.id === horizonte)!.dias
  const probAlta = mercado.precos.probAltaTrigo15dPct
  const vies = probAlta >= 60 ? 'alta' : probAlta >= 45 ? 'estavel' : 'queda'

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Sinais & Previsão"
        title="Previsão de Preço e Câmbio"
        subtitle="Trajetórias com banda de confiança e fatores explicáveis — a base da recomendação do dia."
      />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* 1 · Gráfico principal — preço do trigo */}
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-base font-semibold text-ink">
                  Preço do trigo — histórico e projeção
                </h3>
                {wheatRef.isLive && (
                  <span
                    className={chipRefMensal}
                    title="Escala ancorada na referência mensal (FRED via Alpha Vantage) — não é cotação intraday CBOT"
                  >
                    ref. mensal
                  </span>
                )}
              </div>
              <p className="tnums mt-0.5 text-xs text-ink-subtle">
                {origemSelecionada ? (
                  `FOB ${origemSelecionada.rotulo} = CBOT + prêmio de origem (US$ ${origemSelecionada.premioAtualUsdT} hoje → US$ ${origemSelecionada.premioD90UsdT} em 90d)`
                ) : wheatRef.isLive ? (
                  <>
                    Ref. mensal hoje: US${' '}
                    <AnimatedNumber valor={serie.valorAtual * razaoTrigo} formatar={(v) => String(Math.round(v))} />
                    /t · projeção {formatPct(serie.variacao30dPct, 1)} em 30d
                  </>
                ) : (
                  `CBOT hoje: US$ ${serie.valorAtual}/t · projeção ${formatPct(serie.variacao30dPct, 1)} em 30d`
                )}
              </p>
              <div className="-ml-1.5 mt-1 flex flex-wrap items-center gap-1">
                <SourceBadge familia="preco" />
                {wheatRef.isLive && (
                  <BadgeFonteAoVivo familia="preco" fonte={FONTE_WHEAT_REF} updatedAt={wheatRef.updatedAt} isLive />
                )}
              </div>
              {wheatRef.isLive && (
                <p className="tnums mt-1 text-11 text-ink-faint">
                  Âncora: referência mensal US$ {Math.round(wheatRef.value.precoUsdT)}/t ({wheatRef.value.data.slice(0, 7)})
                  {wheatRef.value.stale ? ' · cache' : ''} — o gráfico reescala sobre a âncora; forma, bandas e
                  probabilidade seguem o cenário.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Toggle
                ariaLabel="Unidade de preço"
                opcoes={[
                  { id: 'usd', rotulo: 'US$/t' },
                  { id: 'brl', rotulo: 'R$/t' },
                ]}
                valor={unidade}
                onChange={setUnidade}
              />
              <Toggle ariaLabel="Horizonte da projeção" opcoes={HORIZONTES} valor={horizonte} onChange={setHorizonte} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
              Origem da curva projetada
            </span>
            <Toggle ariaLabel="Origem da curva projetada" opcoes={ORIGENS_CURVA} valor={origem} onChange={setOrigem} />
          </div>
          <div className="mt-4" data-spot="previsao">
            <ForecastChart
              historico={historicoVisivel}
              projecao={projecaoVisivel}
              formatValor={fmtPreco}
              formatTick={fmtTickPreco}
              rotuloProjecao={origemSelecionada ? `Projeção FOB ${origemSelecionada.rotulo}` : 'Projeção CBOT'}
              ariaLabel={`Gráfico do preço do trigo: histórico e projeção de ${diasHorizonte} dias com banda de confiança`}
            />
          </div>
          {origemSelecionada && (
            <p className="mt-2 text-[11px] text-ink-subtle">
              Histórico exibido: CBOT (referência). A curva projetada aplica o prêmio da origem selecionada.
            </p>
          )}
        </Card>

        {/* 3 · Card de leitura */}
        <Card variant="gold">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Leitura do modelo</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="tnums font-display text-4xl font-semibold leading-none text-ink">
                {formatPct(probAlta)}
              </p>
              <p className="mt-1 text-xs text-ink-muted">Probabilidade de alta em 15 dias</p>
            </div>
            <Badge
              kind="status"
              label={vies === 'alta' ? 'Viés: Alta' : vies === 'estavel' ? 'Viés: Estável' : 'Viés: Queda'}
              tone={vies === 'alta' ? 'danger' : vies === 'estavel' ? 'neutral' : 'positive'}
            />
          </div>
          <ConfidenceMeter value={probAlta} label="Convicção do modelo" className="mt-3" />
          <dl className="mt-4 space-y-2 border-t border-edge/60 pt-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-subtle">Faixa esperada ({diasHorizonte}d)</dt>
              <dd className="tnums font-semibold text-ink">
                {pontoHorizonte?.bandaMin != null && pontoHorizonte?.bandaMax != null
                  ? `${fmtPreco(pontoHorizonte.bandaMin)} – ${fmtPreco(pontoHorizonte.bandaMax).replace(/^(US\$|R\$) /, '')}`
                  : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-subtle">Cenário central ({diasHorizonte}d)</dt>
              <dd className="tnums font-semibold text-gold-light">{pontoHorizonte ? fmtPreco(pontoHorizonte.valor) : '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-subtle">Câmbio projetado (90d)</dt>
              {/* Derivado-ao-vivo: forma encenada × razão do spot real (cenário: razão 1) */}
              <dd className="tnums font-semibold text-ink">{fmtCambio(previsao.cambio.horizontes.d90.valor * razaoCambio)}</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-card border border-gold/30 bg-navy/40 px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
            <TrendArrow direction="up" tone="warning" size={14} label="Tendência de alta" />{' '}
            <span className="font-semibold text-ink">E daí?</span> Comprar dentro da janela de{' '}
            {compra.recomendacao.janelaDias} dias trava {formatBRL(tlc.recomendadoRs)}/t e evita o baseline de{' '}
            {formatBRL(tlc.baselineRs)}/t projetado — {formatBRL(compra.recomendacao.economiaTotalRs, { compacto: true })}{' '}
            no lote de {formatTon(compra.recomendacao.volumeToneladas)}.
          </p>
        </Card>

        {/* 2 · Gráfico secundário — câmbio (histórico REAL quando ao vivo) */}
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-base font-semibold text-ink">Câmbio USD/BRL — histórico e forward</h3>
                {fx.isLive && <span className={chipAoVivo}>ao vivo</span>}
              </div>
              <p className="tnums mt-0.5 text-xs text-ink-subtle">
                Spot{' '}
                {fx.isLive ? (
                  <AnimatedNumber valor={fx.value.taxa} formatar={fmtCambio} />
                ) : (
                  fmtCambio(cambioAtual)
                )}{' '}
                · NDF 90d {fmtCambio(hedge.recomendacao.taxaForwardMedia)} · projeção 90d{' '}
                {fmtCambio(previsao.cambio.horizontes.d90.valor * razaoCambio)}
              </p>
              <div className="-ml-1.5 mt-1">
                <BadgeFonteAoVivo familia="cambio" fonte={FONTE_FRANKFURTER} updatedAt={fx.updatedAt} isLive={fx.isLive} />
              </div>
              {fx.isLive && (
                <p className="tnums mt-1 text-11 text-ink-faint">
                  Histórico real (Frankfurter/BCE, ~90d); projeção com a forma do cenário re-ancorada no spot — NDF e
                  recomendação de hedge seguem encenados.
                </p>
              )}
            </div>
            <Badge kind="status" label={`Limite de política: ${fmtCambio(snapshot.hedge.politicaCambioLimite)}`} tone="warning" />
          </div>
          <div className="mt-4">
            <ForecastChart
              historico={historicoCambio}
              projecao={projecaoCambio}
              formatValor={fmtCambio}
              formatTick={fmtTickCambio}
              rotuloProjecao="Forward / projeção"
              height={220}
              ariaLabel="Gráfico do câmbio USD/BRL: histórico e projeção com banda de confiança"
            />
          </div>
        </Card>

        {/* 4 · Fatores explicáveis */}
        <Card>
          <h3 className="font-display text-base font-semibold text-ink">O que está movendo o preço</h3>
          <p className="mt-0.5 text-xs text-ink-subtle">Importância relativa dos fatores no modelo (soma 100%)</p>
          <div className="-ml-1.5 mt-1">
            <SourceBadge familia="safra" />
          </div>
          <ul className="mt-4 space-y-3">
            {serie.fatores.map((fator) => {
              const cor = corDirecao[fator.direcao]
              return (
                <li key={fator.rotulo}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-ink">{fator.rotulo}</span>
                    <span className={`tnums font-semibold ${cor.texto}`}>
                      {cor.sinal}
                      {formatPct(Math.round(fator.peso * 100))}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-edge/40">
                    <div className={`h-full rounded-full ${cor.barra}`} style={{ width: `${fator.peso * 100}%` }} />
                  </div>
                  {fator.descricao && <p className="mt-1 text-[11px] leading-snug text-ink-subtle">{fator.descricao}</p>}
                </li>
              )
            })}
          </ul>
          <p className="mt-3 border-t border-edge/60 pt-2 text-[11px] text-ink-subtle">
            <span className="text-danger">+ pressiona o preço para cima</span> ·{' '}
            <span className="text-positive">− alivia o preço</span>
          </p>
        </Card>

        {/* 5 · Periferia ao vivo (FX/clima reais com fallback) — núcleo encenado */}
        <SinaisExternos className="lg:col-span-3" />

        {/* 6 · Clima real nas regiões de trigo (anomalia → risco de safra) */}
        <WeatherPanel className="lg:col-span-3" />
      </div>

      {/* 6 · Rodapé com CTAs */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs italic text-ink-subtle">
            Previsão com intervalo de confiança e fatores — a IA recomenda, o executivo decide.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/simulador" className={btnPrimary}>
              Levar ao Simulador
            </Link>
            <Link to="/tlc" className={btnGhost}>
              Ver impacto no TLC
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
