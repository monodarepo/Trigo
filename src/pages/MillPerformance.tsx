import { useMemo, useState } from 'react'
import { Factory, Gauge, TrendingDown } from 'lucide-react'
import {
  Badge,
  Card,
  DataTable,
  KpiTile,
  Pill,
  SectionTitle,
  type DataTableColumn,
} from '../components/ui'
import { CustoFarinhaWaterfall } from '../components/charts/CustoFarinhaWaterfall'
import { RendimentoMoinhosChart } from '../components/charts/RendimentoMoinhosChart'
import { UtilizacaoGauge } from '../components/charts/UtilizacaoGauge'
import { SourceBadge } from '../components/trust/SourceBadge'
import { WhyPopover } from '../components/trust/WhyPopover'
import { abrirObjeto } from '../components/object/objectBus'
import {
  ECONOMIA_MOAGEM,
  FARINHA_ANCORA,
  ROTULO_SEMAFORO,
  MOINHO_ANCORA,
  custoInternoFarinha,
  eficienciaMoinhos,
  formatBRL,
  formatPct,
  formatTon,
  getFarinha,
  getMoinho,
  resumoParqueMoageiro,
  sensibilidadeRendimentoRsT,
  type EficienciaMoinho,
  type MoinhoId,
  type SemaforoMoinho,
} from '../data'

/**
 * Performance dos Moinhos — o custo REAL da farinha, unidade a unidade.
 *
 * As sete unidades são medidas na MESMA spec (farinha de massas) para que a
 * comparação seja apples-to-apples: trocar a spec mudaria blend, rendimento e
 * preço de mercado ao mesmo tempo, e nenhuma diferença entre moinhos seria
 * atribuível ao moinho. O custo do trigo posto em cada um vem do motor de TLC
 * (elo 1) — esta tela não inventa número nenhum.
 */

const FARINHA_REF = FARINHA_ANCORA
/** Família de proveniência: custo de moagem é dado interno de estoque/produção. */
const FAMILIA_CUSTO = 'estoque' as const

const CLASSE_SEMAFORO: Record<SemaforoMoinho, string> = {
  verde: 'border-positive/40 bg-positive/10 text-positive',
  ambar: 'border-warning/40 bg-warning/10 text-warning',
  vermelho: 'border-danger/40 bg-danger/10 text-danger',
}

const rs1 = (v: number) => formatBRL(v, { casas: 1 })
const producaoDe = (u: EficienciaMoinho) => Math.round((u.capacidadeFarinhaT * u.utilizacaoPct) / 100)

export default function MillPerformance() {
  const unidades = useMemo(() => eficienciaMoinhos(FARINHA_REF), [])
  const parque = useMemo(() => resumoParqueMoageiro(FARINHA_REF), [])
  const [selecionado, setSelecionado] = useState<MoinhoId>(MOINHO_ANCORA)

  const unidade = unidades.find((u) => u.moinhoId === selecionado)!
  const moinho = getMoinho(selecionado)!
  const custo = useMemo(() => custoInternoFarinha(selecionado, FARINHA_REF), [selecionado])
  const ganhoPorPontoRsT = sensibilidadeRendimentoRsT(selecionado, FARINHA_REF)
  const farinha = getFarinha(FARINHA_REF)!

  const colunas: ReadonlyArray<DataTableColumn<EficienciaMoinho>> = [
    {
      key: 'moinho',
      header: 'Moinho',
      align: 'left',
      sortValue: (u) => getMoinho(u.moinhoId)!.nome,
      render: (u) => {
        const m = getMoinho(u.moinhoId)!
        return (
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSelecionado(u.moinhoId)}
              aria-pressed={u.moinhoId === selecionado}
              title={`Abrir a decomposição do custo de ${m.nome}`}
              className="truncate rounded text-left font-medium text-ink underline-offset-2 hover:text-gold-light hover:underline focus-visible:text-gold-light"
            >
              {m.nome}
            </button>
            <span className="shrink-0 text-11 text-ink-faint">{m.uf}</span>
            {u.moinhoId === parque.maisCompetitivo.moinhoId && (
              <Badge kind="status" label="menor custo" tone="positive" />
            )}
            {u.moinhoId === parque.menorUtilizacao.moinhoId && (
              <Badge kind="status" label="menor utilização" tone="warning" />
            )}
          </div>
        )
      },
    },
    {
      key: 'rendimento',
      header: 'Rendimento',
      align: 'right',
      sortValue: (u) => u.rendimentoPct,
      render: (u) => <span className="font-mono">{formatPct(u.rendimentoPct, 1)}</span>,
    },
    {
      key: 'extracao',
      header: 'Extração',
      align: 'right',
      sortValue: (u) => u.extracaoPct,
      render: (u) => <span className="font-mono text-ink-muted">{formatPct(u.extracaoPct, 1)}</span>,
    },
    {
      key: 'utilizacao',
      header: 'Utilização',
      align: 'right',
      sortValue: (u) => u.utilizacaoPct,
      render: (u) => (
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              u.semaforo === 'verde'
                ? 'bg-positive'
                : u.semaforo === 'ambar'
                  ? 'bg-warning'
                  : 'bg-danger'
            }`}
            aria-hidden="true"
          />
          <span className="font-mono">{formatPct(u.utilizacaoPct, 0)}</span>
        </span>
      ),
    },
    {
      key: 'custo',
      header: 'Custo da farinha',
      align: 'right',
      sortValue: (u) => u.custoInternoRsT,
      render: (u) => (
        <span className={`font-mono font-semibold ${u.ganhoRsT > 0 ? 'text-ink' : 'text-danger'}`}>
          {rs1(u.custoInternoRsT)}
        </span>
      ),
    },
    {
      key: 'marginal',
      header: 'Custo marginal',
      align: 'right',
      sortValue: (u) => u.custoMarginalRsT,
      render: (u) => <span className="font-mono text-ink-muted">{rs1(u.custoMarginalRsT)}</span>,
    },
    {
      key: 'farelo',
      header: 'Crédito farelo',
      align: 'right',
      sortValue: (u) => u.creditoFareloRsT,
      render: (u) => <span className="font-mono text-positive">−{rs1(u.creditoFareloRsT)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Moinhos & Farinha"
        title="Performance dos Moinhos"
        subtitle={`O custo real da farinha, moinho a moinho — as sete unidades medidas na mesma spec (${farinha.nome.toLowerCase()}) para que a diferença seja da unidade, não do produto.`}
        actions={<SourceBadge familia={FAMILIA_CUSTO} />}
      />

      {/* 1 · Retrato do parque — contexto silencioso em quatro números */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Custo médio do parque"
          value={rs1(parque.custoMedioRsT)}
          unit="/t"
          hint={`Ponderado pela produção de ${formatTon(parque.producaoMensalT)}/mês`}
          fonte={
            <WhyPopover
              titulo="Custo médio do parque"
              explicacao="Custo pleno das sete unidades ponderado pela produção de cada uma (capacidade × utilização). Uma média simples daria o mesmo peso a um moinho pequeno e a um grande e distorceria o custo da companhia."
              linhas={unidades.map((u) => ({
                rotulo: getMoinho(u.moinhoId)!.nome,
                valor: `${rs1(u.custoInternoRsT)} · ${formatTon(producaoDe(u))}`,
              }))}
              familia={FAMILIA_CUSTO}
            />
          }
        />
        <KpiTile
          label="Spread do parque"
          value={rs1(parque.spreadRsT)}
          unit="/t"
          delta={{
            label: `${getMoinho(parque.maisCompetitivo.moinhoId)!.nome} → ${getMoinho(parque.menosCompetitivo.moinhoId)!.nome}`,
            direction: 'up',
            tone: 'warning',
          }}
          hint="Distância entre a melhor e a pior unidade"
          fonte={
            <WhyPopover
              titulo="Spread entre unidades"
              explicacao="Quanto custa a mesma tonelada de farinha na melhor e na pior unidade. O spread mede a oportunidade de realocar volume entre moinhos — e quase todo ele nasce da logística interna do trigo, não da eficiência de moagem."
              linhas={[
                {
                  rotulo: `${getMoinho(parque.maisCompetitivo.moinhoId)!.nome} (melhor)`,
                  valor: `${rs1(parque.maisCompetitivo.custoInternoRsT)}/t`,
                },
                {
                  rotulo: `${getMoinho(parque.menosCompetitivo.moinhoId)!.nome} (pior)`,
                  valor: `${rs1(parque.menosCompetitivo.custoInternoRsT)}/t`,
                },
                { rotulo: 'Spread', valor: `${rs1(parque.spreadRsT)}/t`, destaque: true },
              ]}
            />
          }
        />
        <KpiTile
          label="Capacidade ociosa"
          value={formatTon(parque.capacidadeOciosaTotalT)}
          unit="/mês"
          hint="Folga do parque — vendável acima do custo marginal"
          fonte={
            <WhyPopover
              titulo="Capacidade ociosa vendável"
              explicacao="Folga somada das sete unidades nesta spec. É o volume que pode ir para venda externa sem deslocar a demanda das fábricas próprias — desde que o preço líquido supere o custo marginal da unidade que produzir."
              linhas={unidades.map((u) => ({
                rotulo: getMoinho(u.moinhoId)!.nome,
                valor: formatTon(u.capacidadeOciosaT),
              }))}
            />
          }
        />
        <KpiTile
          label="Abaixo do mínimo econômico"
          value={String(parque.abaixoDoMinimo.length)}
          unit={parque.abaixoDoMinimo.length === 1 ? 'unidade' : 'unidades'}
          delta={
            parque.abaixoDoMinimo.length > 0
              ? {
                  label: parque.abaixoDoMinimo.map((u) => getMoinho(u.moinhoId)!.nome).join(', '),
                  direction: 'down',
                  tone: 'danger',
                }
              : undefined
          }
          hint="Custo pleno já supera o mercado da região"
          fonte={
            <WhyPopover
              titulo="Capacidade econômica mínima"
              explicacao="Rodar menos não muda o custo variável, mas espalha o mesmo custo fixo por menos toneladas. O mínimo econômico é a utilização em que o custo pleno alcança o preço de mercado da região: abaixo dela, moer custa mais do que comprar pronto. A unidade entra em vermelho quando nem a 100% fica competitiva."
              linhas={[
                { rotulo: 'custo(u)', valor: 'custo atual + fixo × (util. atual ÷ u − 1)' },
                { rotulo: 'u mínimo', valor: 'util. atual ÷ (1 + ganho ÷ fixo)', destaque: true },
              ]}
            />
          }
        />
      </div>

      {/* 2 · O elemento dominante: a decomposição do custo da unidade escolhida */}
      <Card variant="gold" className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Decomposição do custo · {farinha.nome}</p>
            <h2 className="mt-1 font-display text-20 font-semibold text-ink">
              Moinho {moinho.nome}
              <span className="ml-2 text-13 font-medium text-ink-subtle">
                {moinho.cidade}/{moinho.uf}
              </span>
            </h2>
            <p className="tnums mt-3 font-display text-40 font-semibold leading-none text-ink">
              {rs1(unidade.custoInternoRsT)}
              <span className="ml-1.5 font-sans text-16 font-medium text-ink-subtle">
                /t de farinha
              </span>
            </p>
            <p className="mt-2.5 max-w-2xl text-13 leading-relaxed text-ink-muted">
              Trigo a {rs1(unidade.tlcTrigoRsT)}/t posto no moinho, rendimento de{' '}
              {formatPct(unidade.rendimentoPct, 1)} e crédito de farelo de {rs1(unidade.creditoFareloRsT)}/t
              produzem esse custo — contra {rs1(unidade.precoExternoRsT)}/t da mesma spec no mercado
              regional.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-11 font-semibold ${
                unidade.ganhoRsT >= 0
                  ? 'border-positive/40 bg-positive/10 text-positive'
                  : 'border-danger/40 bg-danger/10 text-danger'
              }`}
            >
              {unidade.ganhoRsT >= 0 ? '+' : '−'}
              {rs1(Math.abs(unidade.ganhoRsT))}/t vs mercado
            </span>
            <button
              type="button"
              onClick={() => abrirObjeto('moinho', unidade.moinhoId)}
              className="rounded-full border border-edge px-3 py-1 text-11 font-semibold text-ink-muted transition-colors hover:border-edge-strong hover:text-ink"
            >
              Ficha da unidade
            </button>
          </div>
        </div>

        {/* Seletor de unidade — mesmo estado que a tabela, o gráfico e os cards controlam */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Selecionar moinho">
          {unidades.map((u) => {
            const ativo = u.moinhoId === selecionado
            return (
              <button
                key={u.moinhoId}
                type="button"
                onClick={() => setSelecionado(u.moinhoId)}
                aria-pressed={ativo}
                className={`rounded-full border px-3 py-1 text-11 font-semibold transition-colors ${
                  ativo
                    ? 'border-gold/50 bg-gold/15 text-gold-light'
                    : 'border-edge bg-card-2 text-ink-subtle hover:border-edge-strong hover:text-ink'
                }`}
              >
                {getMoinho(u.moinhoId)!.nome}
              </button>
            )
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0">
            <CustoFarinhaWaterfall
              componentes={custo.componentes}
              totalRsT={custo.totalRsT}
              ariaLabel={`Decomposição do custo da ${farinha.nome.toLowerCase()} no moinho ${moinho.nome}: sete passos, do trigo ajustado pelo rendimento até ${rs1(custo.totalRsT)} por tonelada de farinha.`}
            />
            <p className="mt-2 text-11 leading-relaxed text-ink-subtle">
              Passe o cursor em cada barra para o porquê do componente. O crédito do farelo desce a barra
              porque é receita: abate o custo em vez de somar.
            </p>
          </div>

          <div className="space-y-4">
            <UtilizacaoGauge
              utilizacaoPct={unidade.utilizacaoPct}
              utilizacaoMinimaPct={unidade.utilizacaoMinimaPct}
              semaforo={unidade.semaforo}
              capacidadeOciosaT={unidade.capacidadeOciosaT}
              diagnostico={unidade.diagnostico}
              ariaLabel={`Utilização do moinho ${moinho.nome}: ${formatPct(unidade.utilizacaoPct, 0)} contra mínimo econômico de ${
                unidade.utilizacaoMinimaPct != null
                  ? formatPct(unidade.utilizacaoMinimaPct, 1)
                  : 'inalcançável nesta spec'
              }.`}
            />
            <dl className="space-y-2.5 rounded-card border border-edge/60 bg-card-2 p-4 text-13">
              {[
                {
                  rotulo: 'Custo pleno (P&L)',
                  valor: rs1(unidade.custoInternoRsT),
                  nota: 'inclui a depreciação',
                },
                {
                  rotulo: 'Custo evitável (Make/Buy)',
                  valor: rs1(unidade.custoEvitavelRsT),
                  nota: 'sem a depreciação afundada',
                },
                {
                  rotulo: 'Custo fixo absorvido',
                  valor: rs1(unidade.custoFixoRsT),
                  nota: 'o que se dilui rodando mais',
                },
              ].map((linha) => (
                <div key={linha.rotulo} className="flex items-baseline justify-between gap-3">
                  <dt className="min-w-0">
                    <span className="text-ink-muted">{linha.rotulo}</span>
                    <span className="block text-11 text-ink-subtle">{linha.nota}</span>
                  </dt>
                  <dd className="tnums shrink-0 font-mono font-semibold text-ink">{linha.valor}/t</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Card>

      {/* 3 · O custo marginal — a ponte para o Make/Buy/Sell */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow flex items-center gap-1.5">
              <TrendingDown size={12} className="text-gold" aria-hidden="true" />
              Custo marginal
            </p>
            <h2 className="mt-1 font-display text-16 font-semibold text-ink">
              Quanto custa a próxima tonelada
            </h2>
          </div>
          <Pill tone="info">Insumo do Simulador Make/Buy/Sell</Pill>
        </div>
        <p className="max-w-3xl text-13 leading-relaxed text-ink-muted">
          A tonelada adicional não repete o custo pleno: os fixos e a depreciação já foram absorvidos pelo
          volume atual. Ela custa trigo mais a parcela variável de conversão, menos o farelo que gera.{' '}
          <strong className="font-semibold text-ink">Produzir para vender só cria valor acima deste número</strong>{' '}
          — abaixo dele cada tonelada destrói margem, mesmo com o moinho ocioso.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[...unidades]
            .sort((a, b) => a.custoMarginalRsT - b.custoMarginalRsT)
            .map((u) => {
              const margem = u.margemIncrementalRsT
              return (
                <button
                  key={u.moinhoId}
                  type="button"
                  onClick={() => setSelecionado(u.moinhoId)}
                  aria-pressed={u.moinhoId === selecionado}
                  className={`rounded-card border p-3 text-left transition-colors ${
                    u.moinhoId === selecionado
                      ? 'border-gold/50 bg-gold/10'
                      : 'border-edge/70 bg-card-2 hover:border-edge-strong'
                  }`}
                >
                  <p className="truncate text-11 font-medium text-ink-subtle">
                    {getMoinho(u.moinhoId)!.nome}
                  </p>
                  <p className="tnums mt-1 font-display text-20 font-semibold text-ink">
                    {rs1(u.custoMarginalRsT)}
                  </p>
                  <p className={`tnums mt-1 text-11 ${margem > 0 ? 'text-ink-subtle' : 'text-danger'}`}>
                    {margem > 0
                      ? `+${rs1(margem)}/t vendendo a tonelada extra`
                      : `${rs1(margem)}/t: a tonelada extra destrói margem`}
                  </p>
                </button>
              )
            })}
        </div>
      </Card>

      {/* 4 · A tabela ordenável — todo o parque de uma vez */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-16 font-semibold text-ink">As sete unidades</h2>
          <p className="text-11 text-ink-subtle">
            Clique num cabeçalho para ordenar · clique no nome para abrir a decomposição
          </p>
        </div>
        <DataTable
          columns={colunas}
          rows={unidades}
          rowKey={(u) => u.moinhoId}
          minWidth={820}
          caption={`Rendimento, extração, utilização, custo pleno, custo marginal e crédito do farelo da ${farinha.nome.toLowerCase()} nos sete moinhos. Ordenável por qualquer coluna.`}
          /* Pinta as CÉLULAS, não a linha: a faixa zebrada do DataTable é uma
             utilitária de mesma especificidade no <tr>, e qual das duas venceria
             dependeria da ordem no CSS gerado. O fundo do <td> cobre o do <tr>
             sempre, então o destaque é determinístico. */
          rowClassName={(u) =>
            u.moinhoId === selecionado
              ? '[&>td]:bg-gold/[0.09]'
              : u.semaforo === 'vermelho'
                ? '[&>td]:bg-danger/[0.06]'
                : ''
          }
        />
      </div>

      {/* 5 · Rendimento e semáforo — contexto de engenharia */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        <Card className="space-y-3">
          <div>
            <p className="eyebrow flex items-center gap-1.5">
              <Gauge size={12} className="text-gold" aria-hidden="true" />
              Rendimento por unidade
            </p>
            <h2 className="mt-1 font-display text-16 font-semibold text-ink">
              Quanta farinha sai de cada tonelada de trigo
            </h2>
          </div>
          <RendimentoMoinhosChart
            dados={unidades.map((u) => ({
              moinhoId: u.moinhoId,
              nome: getMoinho(u.moinhoId)!.nome,
              rendimentoPct: u.rendimentoPct,
              extracaoPct: u.extracaoPct,
              selecionado: u.moinhoId === selecionado,
            }))}
            referenciaPct={ECONOMIA_MOAGEM.rendimentoCanonicoPct}
            onSelecionar={(id) => setSelecionado(id as MoinhoId)}
            ariaLabel="Rendimento de farinha por moinho, com a extração de farinha refinada indicada dentro de cada barra. O eixo é ampliado para mostrar a variação de poucos pontos percentuais entre as unidades — os valores exatos estão na tabela acima."
          />
          <p className="text-11 leading-relaxed text-ink-subtle">
            Em {moinho.nome}, cada ponto percentual de rendimento a mais derruba o custo em{' '}
            <strong className="font-semibold text-ink-subtle">{rs1(ganhoPorPontoRsT)}/t</strong> de farinha:
            a mesma tonelada de trigo, comprada a {rs1(unidade.tlcTrigoRsT)}/t, rende mais farinha e menos
            farelo (que vale só {rs1(ECONOMIA_MOAGEM.precoFareloRsT)}/t). É alavanca de margem, não só de
            engenharia.
          </p>
        </Card>

        <Card className="space-y-3">
          <div>
            <p className="eyebrow flex items-center gap-1.5">
              <Factory size={12} className="text-gold" aria-hidden="true" />
              Semáforo do parque
            </p>
            <h2 className="mt-1 font-display text-16 font-semibold text-ink">
              Utilização contra o mínimo econômico
            </h2>
          </div>
          <ul className="space-y-2">
            {[...unidades]
              .sort((a, b) => a.utilizacaoPct - b.utilizacaoPct)
              .map((u) => {
                return (
                  <li key={u.moinhoId}>
                    <button
                      type="button"
                      onClick={() => setSelecionado(u.moinhoId)}
                      aria-pressed={u.moinhoId === selecionado}
                      className={`flex w-full items-center justify-between gap-3 rounded-card border px-3 py-2 text-left transition-colors ${
                        u.moinhoId === selecionado
                          ? 'border-gold/50 bg-gold/10'
                          : 'border-edge/60 bg-card-2 hover:border-edge-strong'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-13 font-medium text-ink">
                          {getMoinho(u.moinhoId)!.nome}
                        </span>
                        <span className="tnums block font-mono text-11 text-ink-subtle">
                          {formatPct(u.utilizacaoPct, 0)} de uso · mínimo{' '}
                          {u.utilizacaoMinimaPct != null ? formatPct(u.utilizacaoMinimaPct, 1) : '—'}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-11 font-semibold ${CLASSE_SEMAFORO[u.semaforo]}`}
                      >
                        {ROTULO_SEMAFORO[u.semaforo]}
                      </span>
                    </button>
                  </li>
                )
              })}
          </ul>
          <p className="text-11 leading-relaxed text-ink-subtle">
            O mínimo econômico é a utilização em que a diluição dos custos fixos leva o custo pleno a
            alcançar o preço de mercado da região. Abaixo dela, a ociosidade deixa de ser folga e vira
            destruição de valor.
          </p>
        </Card>
      </div>
    </div>
  )
}
