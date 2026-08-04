import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Lightbulb } from 'lucide-react'
import { Badge, Card, DataTable, SectionTitle, type DataTableColumn } from '../components/ui'
import { TlcWaterfall } from '../components/charts/TlcWaterfall'
import {
  snapshot,
  formatBRL,
  formatPct,
  formatTon,
  type AlternativaCompra,
  type Incoterm,
  type MoinhoId,
  type OrigemId,
  type PortoId,
} from '../data'

const { tlc, dominio } = snapshot

const origemNome = (id: string) => dominio.origens.find((o) => o.id === id)?.nome ?? id
const portoNome = (id: string) => dominio.portos.find((p) => p.id === id)?.nome ?? id
const fornecedorNome = (id: string) => dominio.fornecedores.find((f) => f.id === id)?.nome ?? id

const fmtDelta = (v: number) => `${v < 0 ? '−' : '+'}${formatBRL(Math.abs(v))}`

// Insight fixo: menor FOB ≠ menor landed (Rússia vs Argentina, do snapshot)
const altRecomendada = tlc.alternativas.find((a) => a.recomendada)!
const altRussia = tlc.alternativas.find((a) => a.id === 'alt-russia-suape')!
const deltaInsight = altRussia.tlcRs - altRecomendada.tlcRs

function CampoSelect<T extends string>({
  rotulo,
  valor,
  onChange,
  opcoes,
}: {
  rotulo: string
  valor: T
  onChange: (v: T) => void
  opcoes: ReadonlyArray<{ id: T; rotulo: string }>
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">{rotulo}</span>
      <span className="relative flex items-center">
        <select
          value={valor}
          aria-label={rotulo}
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full appearance-none rounded-card border border-edge bg-card-2 py-2 pl-3 pr-8 text-sm font-medium text-ink transition-colors hover:border-gold/40"
        >
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-ink-subtle" aria-hidden="true" />
      </span>
    </label>
  )
}

const colunas: DataTableColumn<AlternativaCompra>[] = [
  {
    key: 'origem',
    header: 'Origem · Fornecedor',
    render: (a) => (
      <div className="flex items-center gap-2">
        <div>
          <p className="font-medium text-ink">{origemNome(a.origemId)}</p>
          <p className="text-xs text-ink-subtle">
            {fornecedorNome(a.fornecedorId)}
            {a.portoId ? ` · ${portoNome(a.portoId)}` : ' · rodoviário'}
          </p>
        </div>
        {a.recomendada && <Badge kind="status" label="Recomendada" tone="gold" />}
      </div>
    ),
  },
  {
    key: 'fob',
    header: 'FOB (US$/t)',
    align: 'right',
    render: (a) => (a.fobUsd != null ? a.fobUsd : '—'),
  },
  {
    key: 'frete',
    header: 'Frete (US$/t)',
    align: 'right',
    render: (a) => (a.freteUsd != null ? a.freteUsd : '—'),
  },
  {
    key: 'imposto',
    header: 'Imposto',
    align: 'right',
    render: (a) => (
      <span title={a.impostoPct === 0 ? 'Mercosul / doméstico' : 'Extra-Mercosul'}>
        {formatPct(a.impostoPct)}
      </span>
    ),
  },
  {
    key: 'qualidade',
    header: 'Qualidade',
    render: (a) => (
      <span className="tnums text-xs text-ink-muted">
        {a.qualidade.proteina.toLocaleString('pt-BR')}% · W {a.qualidade.w} · FN {a.qualidade.fallingNumber}
      </span>
    ),
  },
  {
    key: 'espec',
    header: 'Especificação',
    render: (a) => (
      <span title={a.observacao}>
        <Badge
          kind="status"
          label={a.atendeEspec ? 'Atende espec.' : 'Não atende'}
          tone={a.atendeEspec ? 'positive' : 'danger'}
        />
      </span>
    ),
  },
  {
    key: 'tlc',
    header: 'TLC (R$/t)',
    align: 'right',
    render: (a) => <span className="font-semibold text-ink">{formatBRL(a.tlcRs)}</span>,
  },
  {
    key: 'delta',
    header: 'Δ vs baseline',
    align: 'right',
    render: (a) => (
      <span className={`font-semibold ${a.deltaVsBaselineRs < 0 ? 'text-positive' : 'text-danger'}`}>
        {fmtDelta(a.deltaVsBaselineRs)}/t
      </span>
    ),
  },
]

export default function LandedCost() {
  const [origemId, setOrigemId] = useState<OrigemId>(tlc.selecaoDefault.origemId)
  const [portoId, setPortoId] = useState<PortoId>(tlc.selecaoDefault.portoId)
  const [moinhoId, setMoinhoId] = useState<MoinhoId>(tlc.selecaoDefault.moinhoId)
  const [incoterm, setIncoterm] = useState<Incoterm>(tlc.selecaoDefault.incoterm)

  const resultado = useMemo(
    () => tlc.calcular({ origemId, portoId, moinhoId, incoterm }),
    [origemId, portoId, moinhoId, incoterm],
  )
  const domestica = origemId === 'brasil'
  const pctFirme = 100 - resultado.risco.pctDoTlc

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Decisão"
        title="Total Landed Cost"
        subtitle="O custo que importa: do FOB ao moinho, ajustado ao risco — não o preço nominal."
      />

      {/* 3 · Seletores */}
      <Card padding="sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CampoSelect
            rotulo="Origem"
            valor={origemId}
            onChange={setOrigemId}
            opcoes={dominio.origens.map((o) => ({ id: o.id, rotulo: o.nome }))}
          />
          <CampoSelect
            rotulo="Porto de destino"
            valor={portoId}
            onChange={setPortoId}
            opcoes={dominio.portos.map((p) => ({ id: p.id, rotulo: `${p.nome}/${p.uf}` }))}
          />
          <CampoSelect
            rotulo="Moinho"
            valor={moinhoId}
            onChange={setMoinhoId}
            opcoes={dominio.moinhos.map((m) => ({ id: m.id, rotulo: `${m.nome}/${m.uf}` }))}
          />
          <CampoSelect
            rotulo="Incoterm"
            valor={incoterm}
            onChange={setIncoterm}
            opcoes={[
              { id: 'FOB', rotulo: 'FOB' },
              { id: 'CFR', rotulo: 'CFR' },
              { id: 'CIF', rotulo: 'CIF' },
            ]}
          />
        </div>
        {domestica && (
          <p className="mt-3 text-xs text-ink-subtle">
            Compra doméstica: sem FOB, frete marítimo ou câmbio — porto e incoterm não se aplicam.
          </p>
        )}
        {!domestica && incoterm !== 'FOB' && (
          <p className="mt-3 text-xs text-ink-subtle">
            No {incoterm}, frete{incoterm === 'CIF' ? ' e seguro ficam' : ' fica'} embutido
            {incoterm === 'CIF' ? 's' : ''} no preço — a composição muda, o total não.
          </p>
        )}
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* 1 · Waterfall */}
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Decomposição do custo (R$/t)</h3>
              <p className="mt-0.5 text-xs text-ink-subtle">
                {origemNome(origemId)}
                {domestica ? '' : ` → ${portoNome(portoId)}`} → moinho{' '}
                {dominio.moinhos.find((m) => m.id === moinhoId)?.nome} · {domestica ? 'doméstico' : incoterm}
              </p>
            </div>
            <div className="text-right">
              <p className="tnums font-display text-2xl font-semibold text-gold-light">
                {formatBRL(resultado.totalRs)}/t
              </p>
              <p
                className={`tnums text-xs font-semibold ${resultado.deltaVsBaselineRs <= 0 ? 'text-positive' : 'text-danger'}`}
              >
                {fmtDelta(resultado.deltaVsBaselineRs)}/t vs baseline {formatBRL(tlc.baselineRs)}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <TlcWaterfall
              componentes={resultado.componentes}
              totalRs={resultado.totalRs}
              ariaLabel={`Waterfall do custo total landed: ${formatBRL(resultado.totalRs)} por tonelada, do FOB ao moinho`}
            />
          </div>
        </Card>

        {/* 5 · Composição do risco */}
        <Card>
          <h3 className="font-display text-base font-semibold text-ink">Composição do risco no custo</h3>
          <p className="mt-0.5 text-xs text-ink-subtle">Risco precificado dentro do TLC — não é custo adicional.</p>
          <div className="mt-4 flex items-end justify-between gap-2">
            <p className="tnums font-display text-3xl font-semibold leading-none text-danger">
              {formatBRL(resultado.risco.totalRs, { casas: 1 })}
              <span className="ml-1 text-sm font-medium text-ink-subtle">/t</span>
            </p>
            <Badge kind="status" label={`${formatPct(resultado.risco.pctDoTlc, 1)} do TLC`} tone="danger" />
          </div>
          <div
            className="mt-3 flex h-2 overflow-hidden rounded-full bg-edge/40"
            role="img"
            aria-label={`Custo firme ${formatPct(pctFirme, 1)}, risco ${formatPct(resultado.risco.pctDoTlc, 1)}`}
          >
            <div className="h-full bg-gold" style={{ width: `${pctFirme}%` }} />
            <div className="h-full bg-danger" style={{ width: `${resultado.risco.pctDoTlc}%` }} />
          </div>
          <p className="mt-1 flex justify-between text-[11px] text-ink-subtle">
            <span>Custo firme {formatPct(pctFirme, 1)}</span>
            <span>Risco {formatPct(resultado.risco.pctDoTlc, 1)}</span>
          </p>
          <ul className="mt-4 space-y-2 border-t border-edge/60 pt-3 text-xs">
            <li className="flex items-center justify-between gap-2">
              <span className="text-ink-muted">Demurrage (fila do porto)</span>
              <span className="tnums font-semibold text-ink">{formatBRL(resultado.risco.demurrageRs, { casas: 1 })}/t</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-ink-muted">Qualidade (DON / variabilidade)</span>
              <span className="tnums font-semibold text-ink">{formatBRL(resultado.risco.qualidadeRs, { casas: 1 })}/t</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-ink-muted">Atraso de navio (janela)</span>
              <span className="tnums font-semibold text-ink">{formatBRL(resultado.risco.atrasoRs, { casas: 1 })}/t</span>
            </li>
          </ul>
          <p className="mt-4 rounded-card border border-edge/60 bg-navy/40 px-3 py-2.5 text-[11px] leading-snug text-ink-subtle">
            Origens de FOB baixo podem carregar risco alto — a Rússia embute R$ 14,6/t só de qualidade. O otimizador
            decide pelo custo ajustado ao risco.
          </p>
          <Link
            to="/compra"
            className="mt-4 inline-block rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink"
          >
            Ver recomendação de compra
          </Link>
        </Card>
      </div>

      {/* 2 · Insight + comparador */}
      <Card variant="gold" padding="sm">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold" aria-hidden="true">
            <Lightbulb size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-ink">Menor FOB ≠ menor landed</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
              A Rússia tem o menor FOB importado (US$ {altRussia.fobUsd}/t vs US$ {altRecomendada.fobUsd}/t da
              Argentina), mas fecha a {formatBRL(altRussia.tlcRs)}/t — {formatBRL(deltaInsight)}/t acima da recomendada.
              Imposto extra-Mercosul de {formatPct(altRussia.impostoPct)}, frete mais longo e risco de qualidade (DON{' '}
              {altRussia.qualidade.don.toLocaleString('pt-BR')} ppb) viram o jogo.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-card border border-danger/40 bg-danger/10 px-3 py-2 text-center">
              <p className="text-[11px] text-ink-subtle">Rússia · FOB US$ {altRussia.fobUsd}</p>
              <p className="tnums font-display text-lg font-semibold text-danger">{formatBRL(altRussia.tlcRs)}/t</p>
            </div>
            <div className="rounded-card border border-positive/40 bg-positive/10 px-3 py-2 text-center">
              <p className="text-[11px] text-ink-subtle">Argentina · FOB US$ {altRecomendada.fobUsd}</p>
              <p className="tnums font-display text-lg font-semibold text-positive">{formatBRL(altRecomendada.tlcRs)}/t</p>
            </div>
          </div>
        </div>
      </Card>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-ink">Comparador de alternativas</h3>
          <p className="text-xs text-ink-subtle">
            Necessidade: {formatTon(snapshot.compra.recomendacao.volumeToneladas)} · baseline {formatBRL(tlc.baselineRs)}/t
          </p>
        </div>
        <DataTable
          caption="Comparativo de alternativas de compra por origem, porto e fornecedor"
          columns={colunas}
          rows={tlc.alternativas}
          rowKey={(a) => a.id}
          minWidth={880}
          rowClassName={(a) => (a.origemId === origemId ? 'bg-gold/10' : '')}
        />
        <p className="mt-2 text-[11px] text-ink-subtle">
          A linha destacada acompanha a origem selecionada nos filtros acima.
        </p>
      </div>
    </div>
  )
}
