import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarRange, Layers } from 'lucide-react'
import { Card, KpiTile, Pill, SectionTitle } from '../components/ui'
import { AnimatedNumber } from '../components/live/AnimatedNumber'
import { SourceBadge } from '../components/trust/SourceBadge'
import { WhyPopover } from '../components/trust/WhyPopover'
import { colors, dataRamp } from '../theme/tokens'
import { formatTon, getFarinha, getMoinho } from '../data'
import {
  CALENDARIO_COM_EVENTOS,
  CAPACIDADE_INSTALADA_MES_T,
  COBERTURA_CONTRATADA_PCT,
  CONSUMO_TRIMESTRE_T,
  DEMANDA_FARINHA,
  FARINHA_DISPONIVEL_MERCADO_T,
  JA_CONTRATADO_TRIMESTRE_T,
  MES_PICO,
  NECESSIDADE_FARINHA_MES_T,
  NECESSIDADE_TRIGO_MES_T,
  OCUPACAO_PARQUE_PCT,
  planoPorMoinho,
} from '../data/demanda'
import { VOLUME_TRIMESTRE_T } from '../data/compra'
import { AlertBanner } from '../alerts/AlertBanner'

/**
 * Planejamento da Demanda — a ponte do plano de vendas até o trigo.
 *
 * A cascata é a conta que reconcilia o elo comercial com o elo do trigo:
 * t de produto vendido × receita da família = t de farinha; ÷ rendimento = t de
 * trigo. O total fecha em 84.051 t/mês, a âncora que o Cockpit e a Compra usam.
 */

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const mesCurto = (iso: string) => {
  const [ano, mes] = iso.split('-')
  return `${MESES_ABREV[Number(mes) - 1]}/${ano.slice(2)}`
}

/** Cascata vendas → farinha → trigo, com bandas ligando os três estágios. */
function CascataDemanda({ ariaLabel }: { ariaLabel: string }) {
  const totalVendas = DEMANDA_FARINHA.reduce((s, d) => s + d.planoVendasT, 0)
  // Escala ÚNICA para os três estágios: com escalas próprias o fluxo mentiria —
  // a farinha pareceria igual às vendas e a perda de conversão sumiria.
  const maiorTotal = Math.max(totalVendas, NECESSIDADE_FARINHA_MES_T, NECESSIDADE_TRIGO_MES_T)

  const H = 290
  const W = 720
  const COL = 78
  const X = [0, (W - COL) / 2, W - COL]
  const escala = (t: number) => (t / maiorTotal) * H

  let yV = 0
  let yF = 0
  let yT = 0
  const segmentos = DEMANDA_FARINHA.map((d, i) => {
    const seg = {
      familia: d.familia,
      rotulo: d.rotulo,
      cor: dataRamp[i % dataRamp.length],
      vendas: { y: yV, h: escala(d.planoVendasT) },
      farinha: { y: yF, h: escala(d.necessidadeFarinhaT) },
      trigo: { y: yT, h: escala(d.necessidadeTrigoT) },
      semFarinha: d.necessidadeFarinhaT === 0,
    }
    yV += seg.vendas.h
    yF += seg.farinha.h
    yT += seg.trigo.h
    return seg
  })

  const banda = (x1: number, y1: number, h1: number, x2: number, y2: number, h2: number) => {
    const cx = (x1 + x2) / 2
    return (
      `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2} ` +
      `L${x2},${y2 + h2} C${cx},${y2 + h2} ${cx},${y1 + h1} ${x1},${y1 + h1} Z`
    )
  }

  return (
    <div>
      <svg
        viewBox={`-44 0 ${W + 88} ${H + 36}`}
        className="w-full"
        role="img"
        aria-label={ariaLabel}
      >
        {segmentos.map((s) =>
          s.semFarinha ? null : (
            <path
              key={`vf-${s.familia}`}
              d={banda(X[0] + COL, s.vendas.y, s.vendas.h, X[1], s.farinha.y, s.farinha.h)}
              fill={s.cor}
              fillOpacity={0.15}
            />
          ),
        )}
        {segmentos.map((s) =>
          s.semFarinha ? null : (
            <path
              key={`ft-${s.familia}`}
              d={banda(X[1] + COL, s.farinha.y, s.farinha.h, X[2], s.trigo.y, s.trigo.h)}
              fill={s.cor}
              fillOpacity={0.15}
            />
          ),
        )}

        {segmentos.map((s) => (
          <g key={s.familia}>
            <rect
              x={X[0]}
              y={s.vendas.y}
              width={COL}
              height={Math.max(1, s.vendas.h - 1)}
              fill={s.cor}
              fillOpacity={s.semFarinha ? 0.32 : 0.85}
              rx={2}
            />
            {!s.semFarinha && (
              <>
                <rect
                  x={X[1]}
                  y={s.farinha.y}
                  width={COL}
                  height={Math.max(1, s.farinha.h - 1)}
                  fill={s.cor}
                  fillOpacity={0.85}
                  rx={2}
                />
                <rect
                  x={X[2]}
                  y={s.trigo.y}
                  width={COL}
                  height={Math.max(1, s.trigo.h - 1)}
                  fill={s.cor}
                  fillOpacity={0.85}
                  rx={2}
                />
              </>
            )}
          </g>
        ))}

        {[
          { x: X[0], titulo: 'Plano de vendas', total: totalVendas },
          { x: X[1], titulo: 'Farinha', total: NECESSIDADE_FARINHA_MES_T },
          { x: X[2], titulo: 'Trigo', total: NECESSIDADE_TRIGO_MES_T },
        ].map((c) => (
          <g key={c.titulo}>
            <text
              x={c.x + COL / 2}
              y={H + 15}
              textAnchor="middle"
              fontSize={11}
              fill={colors.text.subtle}
            >
              {c.titulo}
            </text>
            <text
              x={c.x + COL / 2}
              y={H + 31}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill={colors.text.strong}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(c.total).toLocaleString('pt-BR')} t
            </text>
          </g>
        ))}
      </svg>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segmentos.map((s) => (
          <li key={s.familia} className="flex items-center gap-1.5 text-11">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: s.cor, opacity: s.semFarinha ? 0.45 : 1 }}
              aria-hidden="true"
            />
            <span className="text-ink-muted">{s.rotulo}</span>
            {s.semFarinha && <span className="text-ink-subtle">(não usa farinha)</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function DemandPlanning() {
  const [mesSelecionado, setMesSelecionado] = useState<string>(MES_PICO.mes)
  const plano = useMemo(() => planoPorMoinho(), [])
  const mes =
    CALENDARIO_COM_EVENTOS.find((m) => m.mes === mesSelecionado) ?? CALENDARIO_COM_EVENTOS[0]
  const maiorTrigoMes = Math.max(...CALENDARIO_COM_EVENTOS.map((m) => m.trigoT))
  const maiorCapacidade = Math.max(...plano.map((p) => p.capacidadeTrigoT))
  const totalInterno = plano.reduce((s, p) => s + p.trigoInternoT, 0)
  const totalDisponivel = plano.reduce((s, p) => s + p.trigoDisponivelT, 0)

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Moinhos & Farinha"
        title="Planejamento da Demanda"
        subtitle="Do plano de vendas à tonelada de trigo: a conta que faz Marketing, Indústria e Suprimentos falarem do mesmo número."
        actions={<SourceBadge familia="estoque" />}
      />

      <AlertBanner rota="/demanda" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Necessidade de trigo"
          value={<AnimatedNumber valor={NECESSIDADE_TRIGO_MES_T} formatar={(v) => formatTon(v)} />}
          unit="/mês"
          hint={`${formatTon(NECESSIDADE_TRIGO_MES_T * 12)}/ano — a âncora de volume do cenário`}
          fonte={
            <WhyPopover
              titulo="Como o trigo é calculado"
              explicacao="Cada família converte o plano de vendas em farinha pela receita média, e a farinha em trigo pelo rendimento de moagem da spec. Margarinas e gorduras entram no plano de vendas mas não consomem farinha — saem da cascata no segundo passo."
              linhas={[
                ...DEMANDA_FARINHA.map((d) => ({
                  rotulo: d.rotulo,
                  valor:
                    d.necessidadeTrigoT > 0
                      ? `${formatTon(d.planoVendasT)} → ${formatTon(d.necessidadeTrigoT)}`
                      : `${formatTon(d.planoVendasT)} → sem trigo`,
                })),
                {
                  rotulo: 'Trigo total',
                  valor: `${formatTon(NECESSIDADE_TRIGO_MES_T)}/mês`,
                  destaque: true,
                },
              ]}
              familia="estoque"
            />
          }
        />
        <KpiTile
          label="Ocupação do parque"
          value={`${OCUPACAO_PARQUE_PCT.toFixed(1).replace('.', ',')}%`}
          hint={`${formatTon(CAPACIDADE_INSTALADA_MES_T)}/mês instalados`}
          delta={{
            label: `${formatTon(CAPACIDADE_INSTALADA_MES_T - NECESSIDADE_TRIGO_MES_T)} de folga`,
            direction: 'up',
            tone: 'positive',
          }}
        />
        <KpiTile
          label="Farinha ao mercado"
          value={formatTon(FARINHA_DISPONIVEL_MERCADO_T)}
          unit="/mês"
          hint="O que sobra depois de atender as fábricas próprias"
          fonte={
            <WhyPopover
              titulo="Farinha disponível ao mercado"
              explicacao="Capacidade de cada moinho menos o trigo que a demanda interna reserva, convertido em farinha pelo rendimento da unidade. É este volume que as Oportunidades Comerciais podem vender sem romper o abastecimento."
              linhas={plano
                .filter((p) => p.farinhaDisponivelT > 0)
                .map((p) => ({
                  rotulo: getMoinho(p.moinhoId)!.nome,
                  valor: formatTon(p.farinhaDisponivelT),
                }))}
            />
          }
        />
        <KpiTile
          label="Consumo do trimestre"
          value={formatTon(CONSUMO_TRIMESTRE_T)}
          hint={`${formatTon(JA_CONTRATADO_TRIMESTRE_T)} já contratados (${COBERTURA_CONTRATADA_PCT.toFixed(1).replace('.', ',')}%)`}
          fonte={
            <WhyPopover
              titulo="Consumo não é compra"
              explicacao="O que os moinhos vão moer no trimestre não é o que falta comprar: parte já está fechada em contrato. É sobre o volume A COMPRAR que a recomendação do dia antecipa 18% — confundir os dois quebra a âncora."
              linhas={[
                { rotulo: 'Consumo do trimestre', valor: formatTon(CONSUMO_TRIMESTRE_T) },
                { rotulo: '(−) já contratado', valor: formatTon(JA_CONTRATADO_TRIMESTRE_T) },
                { rotulo: '= a comprar', valor: formatTon(VOLUME_TRIMESTRE_T), destaque: true },
              ]}
              familia="estoque"
            />
          }
        />
      </div>

      {/* Cascata — o elemento dominante */}
      <Card variant="gold" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow flex items-center gap-1.5">
              <Layers size={12} className="text-gold" aria-hidden="true" />
              Cascata da demanda
            </p>
            <h2 className="mt-1 font-display text-20 font-semibold text-ink">
              Do produto vendido à tonelada de trigo
            </h2>
          </div>
          <Pill tone="neutral">Mesma escala nos três estágios</Pill>
        </div>

        <CascataDemanda
          ariaLabel={`Cascata da demanda: ${formatTon(
            DEMANDA_FARINHA.reduce((s, d) => s + d.planoVendasT, 0),
          )} de produto vendido geram ${formatTon(NECESSIDADE_FARINHA_MES_T)} de farinha e ${formatTon(
            NECESSIDADE_TRIGO_MES_T,
          )} de trigo por mês. Margarinas e gorduras saem da cascata por não consumirem farinha; o trigo supera a farinha porque o rendimento de moagem é de cerca de 76%.`}
        />

        <p className="max-w-4xl text-13 leading-relaxed text-ink-muted">
          A farinha é <strong className="font-semibold text-ink">menor</strong> que o plano de vendas
          porque cada receita usa menos de uma tonelada de farinha por tonelada de produto — e porque
          margarinas e gorduras não usam farinha nenhuma. Já o trigo é{' '}
          <strong className="font-semibold text-ink">maior</strong> que a farinha: com rendimento de
          ~76%, cada tonelada de farinha exige 1,32 t de trigo. O resto vira farelo, que volta como
          crédito no custo.
        </p>

        <div className="grid gap-2 border-t border-edge/60 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          {DEMANDA_FARINHA.filter((d) => d.necessidadeTrigoT > 0).map((d) => (
            <div key={d.familia} className="rounded-card border border-edge/60 bg-card-2 p-3">
              <p className="truncate text-11 font-medium text-ink-subtle">{d.rotulo}</p>
              <p className="tnums mt-1 font-mono text-13 text-ink">
                {formatTon(d.necessidadeTrigoT)}
                <span className="ml-1 text-11 text-ink-subtle">de trigo</span>
              </p>
              <p className="tnums mt-0.5 text-11 text-ink-subtle">
                {getFarinha(d.farinhaId!)!.nome.replace('Farinha para ', '').replace('Farinha ', '')}{' '}
                · segurança {formatTon(d.estoqueSegurancaT)} ({d.estoqueSegurancaDias} d)
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Por moinho */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Alocação por moinho</p>
            <h2 className="mt-1 font-display text-16 font-semibold text-ink">
              Quanto fica dentro e quanto pode ir ao mercado
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-11 text-ink-subtle">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm bg-gold" aria-hidden="true" />
              Consumo interno {formatTon(totalInterno)} de trigo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm bg-positive" aria-hidden="true" />
              Disponível {formatTon(totalDisponivel)} de trigo ={' '}
              {formatTon(FARINHA_DISPONIVEL_MERCADO_T)} de farinha
            </span>
          </div>
        </div>

        <ul className="space-y-2.5">
          {plano.map((p) => {
            const m = getMoinho(p.moinhoId)!
            const larguraTotal = (p.capacidadeTrigoT / maiorCapacidade) * 100
            const pctInterno = (p.trigoInternoT / p.capacidadeTrigoT) * 100
            return (
              <li key={p.moinhoId} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-12 text-ink-muted">{m.nome}</span>
                <span className="min-w-0 flex-1">
                  <span
                    className="flex h-6 overflow-hidden rounded border border-edge/60 bg-surface-3"
                    style={{ width: `${larguraTotal}%` }}
                  >
                    <span
                      className="flex items-center justify-end bg-gold/85 pr-1.5"
                      style={{ width: `${pctInterno}%` }}
                    >
                      {pctInterno > 22 && (
                        <span className="tnums font-mono text-[10px] font-semibold text-navy">
                          {formatTon(p.trigoInternoT)}
                        </span>
                      )}
                    </span>
                    <span
                      className="flex items-center justify-start bg-positive/80 pl-1.5"
                      style={{ width: `${100 - pctInterno}%` }}
                    >
                      {100 - pctInterno > 14 && (
                        <span className="tnums font-mono text-[10px] font-semibold text-navy">
                          {formatTon(p.trigoDisponivelT)}
                        </span>
                      )}
                    </span>
                  </span>
                </span>
                <span className="tnums w-12 shrink-0 text-right font-mono text-11 text-ink-subtle">
                  {p.ocupacaoPct.toFixed(0)}%
                </span>
                <WhyPopover
                  posicao="acima"
                  titulo={`${m.nome} — alocação`}
                  explicacao={`A demanda de cada família é distribuída entre os moinhos que a atendem, proporcionalmente à folga de cada um e respeitando o teto de capacidade. ${m.nome} abastece ${p.familias.join(', ') || 'nenhuma família'}.`}
                  linhas={[
                    { rotulo: 'Capacidade', valor: formatTon(p.capacidadeTrigoT) },
                    { rotulo: 'Consumo interno', valor: formatTon(p.trigoInternoT) },
                    { rotulo: 'Disponível (trigo)', valor: formatTon(p.trigoDisponivelT) },
                    {
                      rotulo: 'Disponível (farinha)',
                      valor: formatTon(p.farinhaDisponivelT),
                      destaque: true,
                    },
                  ]}
                />
              </li>
            )
          })}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge/60 pt-3">
          <p className="max-w-2xl text-11 leading-relaxed text-ink-subtle">
            A folga verde é o volume que o Simulador Make/Buy/Sell trata como capacidade ociosa e que
            as Oportunidades Comerciais podem vender — os três números saem desta alocação, não de
            estimativas separadas.
          </p>
          <div className="flex shrink-0 gap-2">
            <Link
              to="/make-buy-sell"
              className="flex items-center gap-1.5 rounded-full border border-edge px-3 py-1.5 text-11 font-semibold text-ink-muted transition-colors hover:border-edge-strong hover:text-ink"
            >
              Make/Buy/Sell
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
            <Link
              to="/oportunidades"
              className="flex items-center gap-1.5 rounded-full border border-edge px-3 py-1.5 text-11 font-semibold text-ink-muted transition-colors hover:border-edge-strong hover:text-ink"
            >
              Oportunidades
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Card>

      {/* Calendário promocional */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow flex items-center gap-1.5">
              <CalendarRange size={12} className="text-gold" aria-hidden="true" />
              Calendário promocional
            </p>
            <h2 className="mt-1 font-display text-16 font-semibold text-ink">
              O pico de venda vira compra de trigo antes
            </h2>
          </div>
          <Pill tone="warning">
            Pico em {mesCurto(MES_PICO.mes)} · +{formatTon(MES_PICO.trigoT - NECESSIDADE_TRIGO_MES_T)}
          </Pill>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {CALENDARIO_COM_EVENTOS.map((m) => {
            const altura = (m.trigoT / maiorTrigoMes) * 100
            const ativo = m.mes === mesSelecionado
            return (
              <button
                key={m.mes}
                type="button"
                onClick={() => setMesSelecionado(m.mes)}
                aria-pressed={ativo}
                className={`rounded-card border p-2.5 text-left transition-colors ${
                  ativo
                    ? 'border-gold/50 bg-gold/10'
                    : 'border-edge/60 bg-card-2 hover:border-edge-strong'
                }`}
              >
                <span className="flex items-baseline justify-between gap-1">
                  <span className="text-11 font-medium text-ink">{mesCurto(m.mes)}</span>
                  <span
                    className={`tnums font-mono text-[10px] ${
                      m.deltaTrigoT > 0
                        ? 'text-warning'
                        : m.deltaTrigoT < 0
                          ? 'text-info'
                          : 'text-ink-subtle'
                    }`}
                  >
                    {m.deltaTrigoT > 0 ? '+' : ''}
                    {(Math.round(m.deltaTrigoT / 100) / 10).toFixed(1).replace('.', ',')}k
                  </span>
                </span>
                <span className="mt-2 flex h-12 items-end">
                  <span
                    className={`w-full rounded-sm ${m.deltaTrigoT > 0 ? 'bg-gold/70' : 'bg-info/50'}`}
                    style={{ height: `${altura}%` }}
                    aria-hidden="true"
                  />
                </span>
                <span className="tnums mt-1.5 block font-mono text-11 text-ink">
                  {formatTon(m.trigoT)}
                </span>
                {m.evento && (
                  <span className="mt-0.5 block truncate text-[10px] text-gold-light">
                    {m.evento.rotulo}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="rounded-card border border-edge/60 bg-card-2 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-13 font-semibold text-ink">
              {mesCurto(mes.mes)} · {mes.evento?.rotulo ?? 'Sem evento promocional'}
            </p>
            <p className="tnums font-mono text-12 text-ink-muted">
              {formatTon(mes.trigoT)} de trigo · índice {mes.indice.toFixed(2).replace('.', ',')}
            </p>
          </div>
          {mes.evento ? (
            <>
              <p className="mt-1.5 text-12 leading-relaxed text-ink-muted">{mes.evento.detalhe}</p>
              <p className="mt-2 text-12 leading-relaxed text-ink-subtle">
                O trigo precisa estar comprado com{' '}
                <strong className="font-semibold text-ink">{mes.evento.antecedenciaDias} dias</strong>{' '}
                de antecedência — entre fechar o contrato e o grão chegar ao moinho passam embarque,
                trânsito e descarga. As{' '}
                <span className="tnums font-mono text-ink-muted">
                  {formatTon(Math.abs(mes.deltaTrigoT))}
                </span>{' '}
                {mes.deltaTrigoT >= 0 ? 'a mais' : 'a menos'} deste mês entram no timing da
                Recomendação de Compra.
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-12 leading-relaxed text-ink-muted">
              Mês de referência da série: a necessidade fica na base de{' '}
              {formatTon(NECESSIDADE_TRIGO_MES_T)} de trigo.
            </p>
          )}
        </div>
      </Card>

      {/* Reconciliação */}
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Reconciliação com o elo do trigo</p>
          <p className="mt-1.5 max-w-3xl text-13 leading-relaxed text-ink-muted">
            Os {formatTon(CONSUMO_TRIMESTRE_T)} de consumo do trimestre não são o que falta comprar:{' '}
            {formatTon(JA_CONTRATADO_TRIMESTRE_T)} já estão fechados em contrato (
            {COBERTURA_CONTRATADA_PCT.toFixed(1).replace('.', ',')}%), sobrando{' '}
            <strong className="font-semibold text-ink">{formatTon(VOLUME_TRIMESTRE_T)}</strong> a
            comprar — é sobre esse volume que a recomendação do dia antecipa 18%.
          </p>
        </div>
        <Link
          to="/compra"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light"
        >
          Recomendação de Compra
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </Card>
    </div>
  )
}
