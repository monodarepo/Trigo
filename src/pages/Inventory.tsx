import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FlaskConical, Warehouse } from 'lucide-react'
import {
  Badge,
  Card,
  DataTable,
  KpiTile,
  Pill,
  SectionTitle,
  type DataTableColumn,
} from '../components/ui'
import { SourceBadge } from '../components/trust/SourceBadge'
import { WhyPopover } from '../components/trust/WhyPopover'
import { AnimatedNumber } from '../components/live/AnimatedNumber'
import { colors, dataRamp } from '../theme/tokens'
import { FARINHAS, TLC_RECOMENDADO_RS, formatBRL, formatTon, getFarinha, getOrigem } from '../data'
import type { FarinhaId } from '../data'
import {
  ESPECIFICACOES_BLEND,
  IDADE_ATENCAO_DIAS,
  IDADE_CRITICA_DIAS,
  LOTES_TRIGO,
  TOTAL_ESTOQUE_T,
  VALOR_ESTOQUE_RS,
  VOLUMES_MOAGEM_T,
  VOLUME_MOAGEM_PADRAO_T,
  analisarLotes,
  otimizarBlend,
  type AlertaLote,
  type AnaliseLote,
} from '../data/estoqueTrigo'

/**
 * Estoques & Blends — o que está em silo e o blend de menor custo que ele
 * permite.
 *
 * O otimizador é busca exaustiva sobre subconjuntos de até 3 lotes e
 * proporções em passos de 5%, respeitando a quantidade de cada silo. Para a
 * farinha de massas ele cai sozinho em 65% Argentina + 35% EUA-HRW — o mesmo
 * blend da Recomendação de Compra, sem que isso esteja escrito em lugar nenhum.
 */

const rs1 = (v: number) => formatBRL(v, { casas: 1 })
const rs0 = (v: number) => formatBRL(v)
const num = (v: number, casas: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

const ALERTA: Record<AlertaLote, { rotulo: string; classe: string; ponto: string }> = {
  ok: { rotulo: 'Em ordem', classe: 'border-edge bg-card-2 text-ink-subtle', ponto: 'bg-positive' },
  envelhecendo: {
    rotulo: 'Envelhecendo',
    classe: 'border-warning/40 bg-warning/10 text-warning',
    ponto: 'bg-warning',
  },
  critico: {
    rotulo: 'Idade crítica',
    classe: 'border-danger/40 bg-danger/10 text-danger',
    ponto: 'bg-danger',
  },
  incompativel: {
    rotulo: 'Fora da spec',
    classe: 'border-danger/40 bg-danger/10 text-danger',
    ponto: 'bg-danger',
  },
  bloqueado: {
    rotulo: 'Bloqueado',
    classe: 'border-danger/40 bg-danger/10 text-danger',
    ponto: 'bg-danger',
  },
}

/** Donut das proporções do blend — proporção de um todo, que é o que ele faz bem. */
function DonutBlend({
  partes,
  ariaLabel,
}: {
  partes: ReadonlyArray<{ loteId: string; rotulo: string; pct: number }>
  ariaLabel: string
}) {
  const R = 54
  const CIRC = 2 * Math.PI * R
  let acumulado = 0
  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label={ariaLabel}>
      <circle cx={70} cy={70} r={R} fill="none" stroke={colors.surface.s3} strokeWidth={20} />
      {partes.map((p, i) => {
        const dash = (p.pct / 100) * CIRC
        const offset = (acumulado / 100) * CIRC
        acumulado += p.pct
        return (
          <circle
            key={p.loteId}
            cx={70}
            cy={70}
            r={R}
            fill="none"
            stroke={dataRamp[i % dataRamp.length]}
            strokeWidth={20}
            strokeDasharray={`${dash} ${CIRC - dash}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 70 70)"
          />
        )
      })}
      <text
        x={70}
        y={66}
        textAnchor="middle"
        fontSize={11}
        fill={colors.text.subtle}
        style={{ letterSpacing: '0.08em' }}
      >
        LOTES
      </text>
      <text
        x={70}
        y={84}
        textAnchor="middle"
        fontSize={20}
        fontWeight={600}
        fill={colors.text.strong}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {partes.length}
      </text>
    </svg>
  )
}

export default function Inventory() {
  const [farinhaId, setFarinhaId] = useState<FarinhaId>('massa')
  const [volumeT, setVolumeT] = useState<number>(VOLUME_MOAGEM_PADRAO_T)

  const blend = useMemo(() => otimizarBlend(farinhaId, volumeT), [farinhaId, volumeT])
  const analises = useMemo(() => analisarLotes(farinhaId), [farinhaId])
  const spec = ESPECIFICACOES_BLEND[farinhaId]
  const farinha = getFarinha(farinhaId)!

  const emAlerta = analises.filter((a) => a.alerta !== 'ok')
  const incompativeis = analises.filter((a) => a.alerta === 'incompativel' || a.alerta === 'bloqueado')
  const envelhecendo = analises.filter((a) => a.alerta === 'envelhecendo' || a.alerta === 'critico')
  const noBlend = new Set(blend.partes.map((p) => p.loteId))

  const partesComRotulo = blend.partes.map((p) => ({
    ...p,
    rotulo: getOrigem(p.origemId)?.nome ?? p.origemId,
  }))

  const colunas: ReadonlyArray<DataTableColumn<AnaliseLote>> = [
    {
      key: 'lote',
      header: 'Lote · origem · silo',
      align: 'left',
      sortValue: (a) => a.lote.id,
      render: (a) => (
        <div className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate font-mono text-12 font-medium text-ink">{a.lote.id}</span>
            {noBlend.has(a.lote.id) && (
              <Badge kind="status" label="no blend" tone="gold" />
            )}
          </span>
          <span className="block truncate text-11 text-ink-subtle">
            {getOrigem(a.lote.origemId)?.nome} · {a.lote.silo}
          </span>
        </div>
      ),
    },
    {
      key: 'quantidade',
      header: 'Quantidade',
      align: 'right',
      sortValue: (a) => a.lote.quantidadeT,
      render: (a) => <span className="font-mono">{formatTon(a.lote.quantidadeT)}</span>,
    },
    {
      key: 'idade',
      header: 'Idade',
      align: 'right',
      sortValue: (a) => a.idadeDias,
      render: (a) => (
        <span
          className={`font-mono ${
            a.idadeDias >= IDADE_CRITICA_DIAS
              ? 'font-semibold text-danger'
              : a.idadeDias >= IDADE_ATENCAO_DIAS
                ? 'text-warning'
                : 'text-ink-muted'
          }`}
        >
          {a.idadeDias} d
        </span>
      ),
    },
    {
      key: 'proteina',
      header: 'Proteína',
      align: 'right',
      sortValue: (a) => a.lote.qualidade.proteina,
      render: (a) => <span className="font-mono">{num(a.lote.qualidade.proteina, 1)}%</span>,
    },
    {
      key: 'w',
      header: 'W',
      align: 'right',
      sortValue: (a) => a.lote.qualidade.w,
      render: (a) => <span className="font-mono">{a.lote.qualidade.w}</span>,
    },
    {
      key: 'fn',
      header: 'Falling n.',
      align: 'right',
      sortValue: (a) => a.lote.qualidade.fallingNumber,
      render: (a) => (
        <span className="font-mono text-ink-muted">{a.lote.qualidade.fallingNumber} s</span>
      ),
    },
    {
      key: 'umidade',
      header: 'Umidade',
      align: 'right',
      sortValue: (a) => a.lote.qualidade.umidade,
      render: (a) => (
        <span className="font-mono text-ink-muted">{num(a.lote.qualidade.umidade, 1)}%</span>
      ),
    },
    {
      key: 'don',
      header: 'DON',
      align: 'right',
      sortValue: (a) => a.lote.qualidade.don,
      render: (a) => {
        const acima = spec.don.max != null && a.lote.qualidade.don > spec.don.max
        return (
          <span className={`font-mono ${acima ? 'font-semibold text-danger' : 'text-ink-muted'}`}>
            {a.lote.qualidade.don.toLocaleString('pt-BR')}
          </span>
        )
      },
    },
    {
      key: 'custo',
      header: 'Custo',
      align: 'right',
      sortValue: (a) => a.lote.custoRsT,
      render: (a) => (
        <span className="whitespace-nowrap font-mono">{rs0(a.lote.custoRsT)}</span>
      ),
    },
    {
      key: 'alerta',
      header: 'Status',
      align: 'left',
      sortValue: (a) => a.alerta,
      render: (a) => {
        const t = ALERTA[a.alerta]
        return (
          <WhyPopover
            titulo={`${a.lote.id} — ${t.rotulo}`}
            explicacao={a.recomendacao}
            linhas={[
              { rotulo: 'Idade em silo', valor: `${a.idadeDias} dias` },
              { rotulo: 'Status', valor: a.lote.status },
              {
                rotulo: 'Atende sozinho',
                valor:
                  a.atendeSozinho.length > 0
                    ? a.atendeSozinho.map((f) => getFarinha(f)!.nome).join(', ')
                    : 'nenhuma spec',
              },
              {
                rotulo: 'No blend recomendado',
                valor: noBlend.has(a.lote.id)
                  ? `${blend.partes.find((p) => p.loteId === a.lote.id)!.pct}%`
                  : 'não',
                destaque: true,
              },
            ]}
          >
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${t.classe}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${t.ponto}`} aria-hidden="true" />
              {t.rotulo}
            </span>
          </WhyPopover>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Trigo"
        title="Estoques & Blends"
        subtitle="O que está em silo e o blend de menor custo que ele permite — com a especificação inteira atendida, não só a proteína."
        actions={<SourceBadge familia="estoque" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Trigo em silo"
          value={formatTon(TOTAL_ESTOQUE_T)}
          hint={`${LOTES_TRIGO.length} lotes · ${formatBRL(VALOR_ESTOQUE_RS, { compacto: true })} imobilizados`}
        />
        <KpiTile
          label="Custo do blend"
          value={<AnimatedNumber valor={blend.custoRsT} formatar={(v) => rs1(v)} />}
          unit="/t"
          delta={{
            label: `${rs1(Math.abs(blend.custoRsT - TLC_RECOMENDADO_RS))}/t vs TLC do lote`,
            direction: blend.custoRsT > TLC_RECOMENDADO_RS ? 'up' : 'down',
            tone: blend.custoRsT > TLC_RECOMENDADO_RS ? 'warning' : 'positive',
          }}
          hint="Trigo posto no moinho, ponderado pelas frações"
          fonte={
            <WhyPopover
              titulo="Custo do blend"
              explicacao="Média do custo dos lotes ponderada pelas frações do blend. É este número que entra no custo da farinha na Performance dos Moinhos — mudar o blend move o custo da farinha."
              linhas={[
                ...blend.partes.map((p) => ({
                  rotulo: `${p.pct}% ${p.loteId}`,
                  valor: `${rs0(p.custoRsT)}/t`,
                })),
                { rotulo: 'Blend', valor: `${rs1(blend.custoRsT)}/t`, destaque: true },
              ]}
              familia="estoque"
            />
          }
        />
        <KpiTile
          label="Lotes em alerta"
          value={String(emAlerta.length)}
          unit={`de ${LOTES_TRIGO.length}`}
          delta={
            incompativeis.length > 0
              ? {
                  label: `${incompativeis.length} fora da spec planejada`,
                  direction: 'down',
                  tone: 'danger',
                }
              : undefined
          }
          hint={`${envelhecendo.length} envelhecendo · acima de ${IDADE_ATENCAO_DIAS} dias`}
        />
        <KpiTile
          label="Combinações avaliadas"
          value={blend.combinacoesAvaliadas.toLocaleString('pt-BR')}
          hint="Busca exaustiva até 3 lotes, passos de 5%"
          fonte={
            <WhyPopover
              titulo="Como o blend é escolhido"
              explicacao="Não é heurística: o otimizador enumera todos os subconjuntos de até 3 lotes disponíveis e todas as proporções em passos de 5%, descarta o que não cabe no silo ou não atende a spec inteira, e fica com o mais barato. A resposta é ótima dentro dessa grade — que é a mesma em que o moinho opera."
              linhas={[
                { rotulo: 'Lotes elegíveis', valor: String(LOTES_TRIGO.length - blend.descartados.length) },
                { rotulo: 'Passo de proporção', valor: '5%' },
                { rotulo: 'Máximo de lotes no blend', valor: '3' },
                {
                  rotulo: 'Combinações avaliadas',
                  valor: blend.combinacoesAvaliadas.toLocaleString('pt-BR'),
                  destaque: true,
                },
              ]}
            />
          }
        />
      </div>

      {/* Otimizador — o elemento dominante */}
      <Card variant="gold" className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-1.5">
              <FlaskConical size={12} className="text-gold" aria-hidden="true" />
              Otimizador de blend
            </p>
            <h2 className="mt-1 font-display text-20 font-semibold text-ink">
              Blend de menor custo para {farinha.nome.toLowerCase()}
            </h2>
            <p className="tnums mt-3 font-display text-40 font-semibold leading-none text-ink">
              <AnimatedNumber valor={blend.custoRsT} formatar={(v) => rs1(v)} />
              <span className="ml-1.5 font-sans text-16 font-medium text-ink-subtle">
                /t de trigo
              </span>
            </p>
            <p className="mt-2.5 max-w-2xl text-13 leading-relaxed text-ink-muted">
              {blend.racional}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de farinha">
              {FARINHAS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFarinhaId(f.id)}
                  aria-pressed={f.id === farinhaId}
                  className={`rounded-full border px-3 py-1 text-11 font-semibold transition-colors ${
                    f.id === farinhaId
                      ? 'border-gold/50 bg-gold/15 text-gold-light'
                      : 'border-edge bg-card-2 text-ink-subtle hover:border-edge-strong hover:text-ink'
                  }`}
                >
                  {f.nome.replace('Farinha para ', '').replace('Farinha ', '')}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5" role="group" aria-label="Volume de moagem">
              <span className="text-11 text-ink-subtle">Lote de moagem</span>
              {VOLUMES_MOAGEM_T.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVolumeT(v)}
                  aria-pressed={v === volumeT}
                  className={`rounded-full border px-2.5 py-1 font-mono text-11 font-semibold transition-colors ${
                    v === volumeT
                      ? 'border-gold/50 bg-gold/15 text-gold-light'
                      : 'border-edge bg-card-2 text-ink-subtle hover:border-edge-strong hover:text-ink'
                  }`}
                >
                  {formatTon(v)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {blend.atendeSpec ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start">
            {/* Proporções */}
            <div className="flex items-center gap-5">
              <DonutBlend
                partes={partesComRotulo}
                ariaLabel={`Composição do blend: ${partesComRotulo.map((p) => `${p.pct}% ${p.rotulo}`).join(', ')}.`}
              />
              <ul className="min-w-0 flex-1 space-y-2">
                {partesComRotulo.map((p, i) => (
                  <li key={p.loteId} className="flex items-baseline gap-2">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ background: dataRamp[i % dataRamp.length] }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-12 font-medium text-ink">
                        {p.pct}% {p.rotulo}
                      </span>
                      <span className="tnums block font-mono text-11 text-ink-subtle">
                        {p.loteId} · {formatTon(p.toneladas)} · {rs0(p.custoRsT)}/t
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Parâmetros vs alvo */}
            <div className="overflow-hidden rounded-card border border-edge/60">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Parâmetros resultantes do blend contra a faixa-alvo da especificação.
                </caption>
                <thead>
                  <tr className="border-b border-edge/60 bg-card-2">
                    {['Parâmetro', 'Blend', 'Faixa-alvo', 'Folga'].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-subtle"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {blend.aderencia.map((a) => (
                    <tr key={a.chave} className="border-b border-edge/40 last:border-b-0">
                      <td className="px-3 py-1.5 text-12 text-ink-muted">{a.rotulo}</td>
                      <td className="tnums px-3 py-1.5 text-right font-mono text-12 font-semibold text-ink">
                        {num(a.valor, a.casas)}
                        {a.unidade && <span className="ml-0.5 text-ink-subtle">{a.unidade}</span>}
                      </td>
                      <td className="tnums px-3 py-1.5 text-right font-mono text-11 text-ink-subtle">
                        {a.faixa.min != null && a.faixa.max != null
                          ? `${num(a.faixa.min, a.casas)}–${num(a.faixa.max, a.casas)}`
                          : a.faixa.min != null
                            ? `≥ ${num(a.faixa.min, a.casas)}`
                            : a.faixa.max != null
                              ? `≤ ${num(a.faixa.max, a.casas)}`
                              : '—'}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-11 ${
                            !a.atende
                              ? 'font-semibold text-danger'
                              : a.folgaRotulo === 'no limite'
                                ? 'text-warning'
                                : 'text-positive'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              !a.atende
                                ? 'bg-danger'
                                : a.folgaRotulo === 'no limite'
                                  ? 'bg-warning'
                                  : 'bg-positive'
                            }`}
                            aria-hidden="true"
                          />
                          {a.folgaRotulo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-card border border-danger/30 bg-danger/[0.06] px-4 py-4">
            <p className="text-13 font-semibold text-ink">Sem blend viável neste volume</p>
            <p className="mt-1 text-12 leading-relaxed text-ink-muted">{blend.racional}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-edge/60 pt-3 text-11 text-ink-subtle">
          <span>
            Cor e granulometria não entram no otimizador: são definidas pela moagem (extração), não
            pelo trigo em silo.
          </span>
          <span>
            Falling number é misturado pelo <em>liquefaction number</em>, que é aditivo — misturar o
            FN direto superestimaria a resistência do blend.
          </span>
        </div>
      </Card>

      {/* Alertas de destino */}
      {incompativeis.length > 0 && (
        <Card variant="alert" className="space-y-3">
          <div>
            <p className="eyebrow">Lotes fora da spec planejada</p>
            <h2 className="mt-1 font-display text-16 font-semibold text-ink">
              Qualidade inadequada → direcionar a outro segmento
            </h2>
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {incompativeis.map((a) => (
              <li key={a.lote.id} className="rounded-card border border-edge/60 bg-card-2 px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-mono text-12 font-medium text-ink">
                    {a.lote.id}
                  </span>
                  <span className="tnums shrink-0 font-mono text-11 text-ink-subtle">
                    {formatTon(a.lote.quantidadeT)}
                  </span>
                </div>
                <p className="mt-1 text-11 leading-relaxed text-ink-subtle">{a.recomendacao}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Lotes em silo */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-16 font-semibold text-ink">Lotes em silo</h2>
          <p className="text-11 text-ink-subtle">
            Ordenável · destaque dourado nos lotes que entram no blend recomendado
          </p>
        </div>
        <DataTable
          columns={colunas}
          rows={analises}
          rowKey={(a) => a.lote.id}
          minWidth={980}
          caption={`Lotes de trigo em silo com quantidade, idade, qualidade (proteína, W, falling number, umidade, DON), custo e disponibilidade, avaliados contra a especificação de ${farinha.nome.toLowerCase()}.`}
          rowClassName={(a) =>
            noBlend.has(a.lote.id)
              ? '[&>td]:bg-gold/[0.08]'
              : a.alerta === 'critico' || a.alerta === 'incompativel' || a.alerta === 'bloqueado'
                ? '[&>td]:bg-danger/[0.05]'
                : ''
          }
        />
      </div>

      {/* Integração */}
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-1.5">
            <Warehouse size={12} className="text-gold" aria-hidden="true" />
            Para onde esse número vai
          </p>
          <p className="mt-1.5 max-w-3xl text-13 leading-relaxed text-ink-muted">
            O custo do blend é o <strong className="font-semibold text-ink">trigo posto no moinho</strong>{' '}
            que abre a decomposição do custo da farinha. Para a farinha de massas o otimizador chega
            sozinho em 65% Argentina + 35% EUA-HRW — a mesma composição da Recomendação de Compra,
            encontrada aqui pela busca de menor custo e não copiada de lá.{' '}
            <span className="text-ink-subtle">
              Os {rs0(TLC_RECOMENDADO_RS)}/t daquela tela são o TLC do lote argentino; o blend fica{' '}
              {rs1(blend.custoRsT - TLC_RECOMENDADO_RS)}/t acima porque 35% dele é HRW, que paga
              imposto extra-Mercosul e frete mais longo.
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Pill tone="neutral">Blend {blend.partes.length} lotes</Pill>
          <Link
            to="/moinhos"
            className="flex items-center gap-1.5 rounded-full border border-edge px-3 py-1.5 text-11 font-semibold text-ink-muted transition-colors hover:border-edge-strong hover:text-ink"
          >
            Performance dos Moinhos
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
          <Link
            to="/compra"
            className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-11 font-semibold text-navy transition-colors hover:bg-gold-light"
          >
            Recomendação de Compra
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </Card>
    </div>
  )
}
