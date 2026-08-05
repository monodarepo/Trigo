import { Link } from 'react-router-dom'
import {
  Badge,
  Card,
  KpiTile,
  RecommendationCard,
  SectionTitle,
  TrendArrow,
} from '../components/ui'
import { ExposureChart } from '../components/charts/ExposureChart'
import { SourceBadge } from '../components/trust/SourceBadge'
import { AnimatedNumber } from '../components/live/AnimatedNumber'
import { emitirToast } from '../components/feedback/toastBus'
import { BadgeFonteAoVivo } from '../components/live/LiveSourceBadge'
import { useFxAoVivo } from '../live/useLiveData'
import { snapshot, formatBRL, formatPct, formatTon, formatUSD, FONTE_FRANKFURTER } from '../data'

const { hedge, compra, tlc, logistica, mercado, previsao, recomendacaoDoDia } = snapshot
const rec = hedge.recomendacao

const fmtCambio = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`

const btnPrimary =
  'rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light'
const btnGhost =
  'rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink'
const btnMini =
  'rounded-full border border-edge px-3 py-1 text-[11px] font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink'

// --- Exposição (derivada do snapshot) ---
const exposicaoTotalUsd = hedge.posicoes.reduce((s, p) => s + p.expostoUsd, 0) // US$ 108M
const bucketLongoUsd = exposicaoTotalUsd - rec.exposicaoUsd // US$ 36M (91–180d)
const contratadoT = logistica.contratos
  .filter((c) => c.status === 'ativo')
  .reduce((s, c) => s + c.volumeToneladas, 0)
const expostoPrecoT = compra.volumeTrimestreToneladas - contratadoT // 63.000 t
const expostoPrecoRs = expostoPrecoT * tlc.baselineRs // ~R$ 95,8M
const reducaoVarPct = Math.round((1 - rec.varDepoisRs / rec.varAntesRs) * 100) // 54%

// --- Banda de orçamento ---
const orcado = hedge.cambioOrcado
const bandaMin = Math.round(orcado * (1 - hedge.bandaOrcamentoPct / 100) * 100) / 100 // 4,95
const teto = hedge.politicaCambioLimite // 5,25 (≈ orçado +3%)
const spot = mercado.precos.cambioBrlUsd
const proj90 = previsao.cambio.horizontes.d90.valor
const DOMINIO = { min: 4.85, max: 5.45 }
const pos = (v: number) => `${((v - DOMINIO.min) / (DOMINIO.max - DOMINIO.min)) * 100}%`
const desvioOrcadoPct = ((spot / orcado - 1) * 100).toFixed(1).replace('.', ',')
const statusBanda =
  spot >= teto
    ? { rotulo: 'Acima do teto — agir', tone: 'danger' as const }
    : spot > orcado
      ? { rotulo: 'Atenção — perto do teto', tone: 'warning' as const }
      : { rotulo: 'Dentro do orçamento', tone: 'positive' as const }

// --- Alertas de hedge (câmbio + janela) ---
const alertasHedge = snapshot.alertas.filter((a) => a.categoria === 'cambio' || a.categoria === 'hedge')

export default function Hedge() {
  /**
   * ÂNCORA-E-DERIVA — o que é AO VIVO e o que é CENÁRIO nesta tela:
   *  · ÂNCORA (cenário, nunca muda com rede): exposição em US$ (72M/108M),
   *    recomendação "proteger 60%", R$ 4,8M protegidos, VaR, NDF R$ 5,27.
   *  · DERIVA (periferia ao vivo): SÓ a conversão da exposição para R$
   *    escala com o câmbio real (Frankfurter); em Cenário/falha usa R$ 5,20.
   */
  const fx = useFxAoVivo()
  const cambioPeriferia = fx.isLive ? fx.value.taxa : mercado.precos.cambioBrlUsd
  const exposto90dRs = rec.exposicaoUsd * cambioPeriferia
  const expostoTotalRs = exposicaoTotalUsd * cambioPeriferia

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Decisão"
        title="Recomendação de Hedge"
        subtitle="Qual parcela da exposição proteger, com qual instrumento, em qual janela — e por quê."
      />

      {/* 1 · Exposição atual — KPIs */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile
          label="Exposição cambial (90d)"
          value={formatUSD(rec.exposicaoUsd, { compacto: true })}
          hint={`≈ ${formatBRL(exposto90dRs, { compacto: true })} ao câmbio ${fmtCambio(cambioPeriferia)} · + ${formatUSD(bucketLongoUsd, { compacto: true })} em 91–180d`}
          fonte={<BadgeFonteAoVivo familia="cambio" fonte={FONTE_FRANKFURTER} updatedAt={fx.updatedAt} isLive={fx.isLive} />}
        />
        <KpiTile
          label="Coberto vs aberto (90d)"
          value={formatPct(rec.coberturaAtualPct)}
          delta={{ label: `alvo ${formatPct(rec.coberturaAlvoPct)} após execução`, direction: 'up', tone: 'info' }}
        />
        <KpiTile
          label="Exposição a preço"
          value={formatTon(expostoPrecoT)}
          hint={`${formatBRL(expostoPrecoRs, { compacto: true })} ao baseline de ${formatBRL(tlc.baselineRs)}/t`}
          delta={{
            label: `${formatPct(compra.recomendacao.anteciparPctTrimestre)} do trimestre travado na compra`,
            direction: 'down',
            tone: 'positive',
          }}
          fonte={<SourceBadge familia="estoque" />}
        />
        <KpiTile
          label="VaR cambial 95% (90d)"
          value={formatBRL(rec.varAntesRs, { compacto: true })}
          delta={{
            label: `${formatBRL(rec.varDepoisRs, { compacto: true })} após hedge (−${reducaoVarPct}%)`,
            direction: 'down',
            tone: 'positive',
          }}
        />
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2">
        {/* 1 · Gráfico de exposição por bucket */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Exposição por bucket de prazo</h3>
              <p className="tnums mt-0.5 text-xs text-ink-subtle">
                Total {formatUSD(exposicaoTotalUsd, { compacto: true })} ≈{' '}
                <AnimatedNumber valor={expostoTotalRs} formatar={(v) => formatBRL(v, { compacto: true })} /> ao câmbio{' '}
                <AnimatedNumber valor={cambioPeriferia} formatar={fmtCambio} />
                {fx.isLive && (
                  <span className="ml-1.5 rounded-full border border-positive/40 bg-positive/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-positive">
                    ao vivo
                  </span>
                )}
              </p>
              <div className="-ml-1.5 mt-1">
                <SourceBadge familia="cambio" />
              </div>
            </div>
            <Badge kind="status" label={`Ponderado 90d: ${formatPct(rec.coberturaAtualPct)} coberto`} tone="warning" />
          </div>
          <div className="mt-4">
            <ExposureChart
              posicoes={hedge.posicoes}
              ariaLabel="Exposição cambial por bucket de prazo: parcela coberta versus aberta em milhões de dólares"
            />
          </div>
        </Card>

        {/* 2 · Card de recomendação */}
        <RecommendationCard
          title={`Proteger ${formatPct(rec.coberturaAlvoPct)} da exposição cambial de 90 dias`}
          rationale={rec.racional}
          fontes={
            <>
              <SourceBadge familia="cambio" />
              <SourceBadge familia="preco" />
            </>
          }
          badges={
            <>
              <Badge kind="acao" action="proteger" />
              <Badge kind="status" label={`Gatilho: NDF ≤ ${fmtCambio(rec.taxaForwardMedia)}`} tone="warning" />
              <Badge
                kind="status"
                label={`+ ${formatPct(compra.recomendacao.anteciparPctTrimestre)} do preço travado (compra)`}
                tone="info"
              />
            </>
          }
          stats={[
            {
              label: 'Instrumento',
              value: rec.instrumento,
              hint: `${formatUSD(rec.notionalNovoUsd, { compacto: true })} a ${fmtCambio(rec.taxaForwardMedia)}`,
            },
            {
              label: 'Cobertura',
              value: `${formatPct(rec.coberturaAtualPct)} → ${formatPct(rec.coberturaAlvoPct)}`,
              hint: `sobre ${formatUSD(rec.exposicaoUsd, { compacto: true })} (90d)`,
            },
            {
              label: 'Proteção estimada',
              value: formatBRL(rec.protecaoEstimadaRs, { compacto: true }),
              hint: `câmbio ${fmtCambio(rec.cenarioCambioD90)} no cenário-base`,
            },
            {
              label: 'Impacto do dia',
              value: formatBRL(recomendacaoDoDia.impactoProtegidoRs, { compacto: true }),
              hint: `${formatBRL(recomendacaoDoDia.memoriaCalculo.compraAntecipadaRs, { compacto: true })} compra + ${formatBRL(recomendacaoDoDia.memoriaCalculo.hedgeCambialRs, { compacto: true })} hedge`,
            },
          ]}
          extra={
            <div className="flex flex-wrap items-center gap-3 rounded-card border border-edge/60 bg-navy/40 px-3 py-2.5">
              <span className="text-xs font-medium text-ink-subtle">VaR 95% (90d)</span>
              <span className="tnums text-sm font-semibold text-danger">
                {formatBRL(rec.varAntesRs, { compacto: true })}
              </span>
              <TrendArrow direction="down" tone="positive" size={16} label="Redução de risco com o hedge" />
              <span className="tnums text-sm font-semibold text-positive">
                {formatBRL(rec.varDepoisRs, { compacto: true })}
              </span>
              <Badge kind="status" label={`−${reducaoVarPct}%`} tone="positive" />
            </div>
          }
          actions={
            <>
              <button
                type="button"
                className={btnPrimary}
                onClick={() =>
                  emitirToast({ tom: 'sucesso', titulo: 'Ordem de NDF encaminhada à Tesouraria — sujeita à aprovação humana' })
                }
              >
                Executar hedge
              </button>
              <Link to="/simulador" className={btnGhost}>
                Simular cenários de câmbio
              </Link>
            </>
          }
        />

        {/* 3 · Banda de orçamento */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Banda de orçamento cambial</h3>
              <p className="tnums mt-0.5 text-xs text-ink-subtle">
                Orçado {fmtCambio(orcado)} ± {formatPct(hedge.bandaOrcamentoPct)} · teto = gatilho de proteção
              </p>
            </div>
            <Badge kind="status" label={statusBanda.rotulo} tone={statusBanda.tone} />
          </div>

          <div className="relative mt-10 h-2 rounded-full bg-edge/40" aria-hidden="true">
            {/* Faixa orçada */}
            <div
              className="absolute inset-y-0 rounded-full bg-positive/25"
              style={{ left: pos(bandaMin), width: `calc(${pos(teto)} - ${pos(bandaMin)})` }}
            />
            {/* Orçado */}
            <div className="absolute -top-1 h-4 w-0.5 bg-ink-muted" style={{ left: pos(orcado) }} />
            <span className="tnums absolute -top-7 -translate-x-1/2 text-[11px] text-ink-subtle" style={{ left: pos(orcado) }}>
              orçado {fmtCambio(orcado)}
            </span>
            {/* Gatilho / teto */}
            <div className="absolute -top-1 h-4 w-0.5 bg-danger" style={{ left: pos(teto) }} />
            <span
              className="tnums absolute top-9 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-danger"
              style={{ left: pos(teto) }}
            >
              gatilho {fmtCambio(teto)}
            </span>
            {/* Projeção 90d */}
            <div className="absolute -top-1 h-4 w-0.5 bg-info/70" style={{ left: pos(proj90) }} />
            <span className="tnums absolute -top-7 -translate-x-1/2 whitespace-nowrap text-[11px] text-info" style={{ left: pos(proj90) }}>
              proj. 90d {fmtCambio(proj90)}
            </span>
            {/* Spot */}
            <div
              className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-navy bg-gold shadow-card"
              style={{ left: pos(spot) }}
            />
            <span
              className="tnums absolute top-4 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-gold-light"
              style={{ left: pos(spot) }}
            >
              spot {fmtCambio(spot)}
            </span>
          </div>

          <p className="mt-14 text-xs leading-relaxed text-ink-muted">
            Dólar a {fmtCambio(spot)} — {desvioOrcadoPct}% acima do orçado e a{' '}
            {formatPct(Math.round((teto / spot - 1) * 1000) / 10, 1)} do gatilho.{' '}
            <span className="font-semibold text-ink">Dólar a {fmtCambio(teto)} → elevar proteção</span> (política de
            riscos). A projeção de 90 dias ({fmtCambio(proj90)}) já ultrapassa o teto — por isso a janela atual de NDF é
            valiosa.
          </p>
        </Card>

        {/* 4 · Alertas de hedge */}
        <Card>
          <h3 className="font-display text-base font-semibold text-ink">Alertas de hedge</h3>
          <ul className="mt-4 space-y-3">
            {alertasHedge.map((alerta) => (
              <li key={alerta.id} className="rounded-card border border-edge/60 bg-navy/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{alerta.titulo}</p>
                    <p className="mt-1 text-xs leading-snug text-ink-subtle">{alerta.descricao}</p>
                  </div>
                  <Badge
                    kind="status"
                    label={alerta.severidade === 'alto' ? 'Alto' : 'Médio'}
                    tone={alerta.severidade === 'alto' ? 'warning' : 'info'}
                    className="shrink-0"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={btnMini}
                    onClick={() => emitirToast({ tom: 'sucesso', titulo: 'Ordem enviada à Tesouraria para execução na janela' })}
                  >
                    Executar
                  </button>
                  <button
                    type="button"
                    className={btnMini}
                    onClick={() => emitirToast({ tom: 'info', titulo: 'Alerta adiado — reavaliação no próximo pregão' })}
                  >
                    Aguardar
                  </button>
                  <button
                    type="button"
                    className={btnMini}
                    onClick={() => emitirToast({ tom: 'sucesso', titulo: 'Proposta de cobertura adicional enviada ao CFO' })}
                  >
                    Elevar proteção
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {/* 5 · Nota fixa */}
          <p className="mt-4 border-t border-edge/60 pt-3 text-xs italic text-ink-subtle">
            Sujeito à política financeira e à aprovação humana (Tesouraria/CFO).
          </p>
        </Card>
      </div>

    </div>
  )
}
