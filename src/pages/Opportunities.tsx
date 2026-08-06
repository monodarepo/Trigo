import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Handshake, Map as MapIcon, ShieldAlert } from 'lucide-react'
import {
  Badge,
  Card,
  DataTable,
  KpiTile,
  SectionTitle,
  type DataTableColumn,
} from '../components/ui'
import { OpsMap } from '../components/charts/OpsMap'
import { SourceBadge } from '../components/trust/SourceBadge'
import { WhyPopover } from '../components/trust/WhyPopover'
import { abrirObjeto } from '../components/object/objectBus'
import {
  CANAIS_FARINHA,
  OPORTUNIDADES_COMERCIAIS,
  formatBRL,
  formatTon,
  getClienteExterno,
  getFarinha,
  getMoinho,
  resumoPorRegiao,
  type CanalFarinha,
  type OportunidadeComercial,
  type RegiaoComercial,
  type SemaforoRuptura,
  type StatusOportunidade,
} from '../data'
import { AlertBanner } from '../alerts/AlertBanner'

/**
 * Oportunidades Comerciais — onde vender farinha rende mais que usar
 * internamente.
 *
 * A margem de cada conta é calculada pelo motor econômico (preço líquido −
 * custo interno do moinho que atende − custo de servir), e o guardrail separa
 * o volume que cabe na folga do que só sai tirando farinha das fábricas.
 */

const rs1 = (v: number) => formatBRL(v, { casas: 1 })
const rs0 = (v: number) => formatBRL(v)

const SEMAFORO: Record<SemaforoRuptura, { rotulo: string; classe: string; ponto: string }> = {
  seguro: {
    rotulo: 'Sem ruptura',
    classe: 'border-positive/40 bg-positive/10 text-positive',
    ponto: 'bg-positive',
  },
  atencao: {
    rotulo: 'Ruptura parcial',
    classe: 'border-warning/40 bg-warning/10 text-warning',
    ponto: 'bg-warning',
  },
  ruptura: {
    rotulo: 'Rompe o interno',
    classe: 'border-danger/40 bg-danger/10 text-danger',
    ponto: 'bg-danger',
  },
}

const TOM_STATUS: Record<StatusOportunidade, 'positive' | 'warning' | 'danger'> = {
  recomendada: 'positive',
  avaliar: 'warning',
  recusar: 'danger',
}

const ROTULO_STATUS: Record<StatusOportunidade, string> = {
  recomendada: 'Recomendada',
  avaliar: 'Avaliar',
  recusar: 'Recusar',
}

export default function Opportunities() {
  const [regiao, setRegiao] = useState<RegiaoComercial | null>(null)
  const [canal, setCanal] = useState<CanalFarinha | 'todos'>('todos')

  const regioes = useMemo(() => resumoPorRegiao(), [])
  const oportunidades = useMemo(
    () =>
      OPORTUNIDADES_COMERCIAIS.filter(
        (o) => (regiao === null || o.regiao === regiao) && (canal === 'todos' || o.canal === canal),
      ),
    [regiao, canal],
  )

  const recomendadas = OPORTUNIDADES_COMERCIAIS.filter((o) => o.status === 'recomendada')
  const margemTotalRs = recomendadas.reduce((soma, o) => soma + o.margemTotalRs, 0)
  const volumeTotalT = recomendadas.reduce((soma, o) => soma + o.volumeT, 0)
  const superamInterno = OPORTUNIDADES_COMERCIAIS.filter((o) => o.superaUsoInterno === true)
  const comRuptura = OPORTUNIDADES_COMERCIAIS.filter((o) => o.guardrail.volumeEmRupturaT > 0)
  const volumeEmRupturaT = comRuptura.reduce((soma, o) => soma + o.guardrail.volumeEmRupturaT, 0)
  const melhor = [...OPORTUNIDADES_COMERCIAIS].sort((a, b) => b.margemRsT - a.margemRsT)[0]
  const rotuloRegiao = (r: RegiaoComercial) => regioes.find((x) => x.regiao === r)?.rotulo ?? r

  const colunas: ReadonlyArray<DataTableColumn<OportunidadeComercial>> = [
    {
      key: 'cliente',
      header: 'Cliente · região · canal',
      align: 'left',
      sortValue: (o) => getClienteExterno(o.clienteId)!.nome,
      render: (o) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => abrirObjeto('oportunidade', o.id)}
            title={`Abrir o detalhe de ${getClienteExterno(o.clienteId)!.nome}`}
            className="truncate rounded text-left font-medium text-ink underline-offset-2 hover:text-gold-light hover:underline focus-visible:text-gold-light"
          >
            {getClienteExterno(o.clienteId)!.nome}
          </button>
          <span className="block text-11 text-ink-subtle">
            {rotuloRegiao(o.regiao)} ·{' '}
            {CANAIS_FARINHA.find((k) => k.id === o.canal)?.rotulo ?? o.canal} ·{' '}
            {getFarinha(o.farinhaId)!.nome.toLowerCase()}
          </span>
        </div>
      ),
    },
    {
      key: 'preco',
      header: 'Preço líquido',
      align: 'right',
      sortValue: (o) => o.precoLiquidoRsT,
      render: (o) => <span className="font-mono">{rs0(o.precoLiquidoRsT)}</span>,
    },
    {
      /**
       * O custo interno fecha a conta na própria linha (preço − custo − servir
       * = margem). Sem ele visível, esta tela era a única do elo da farinha em
       * que o R$ 2.100/t não aparecia, e a margem tinha de ser aceita de fé.
       */
      key: 'custo',
      header: 'Custo interno',
      align: 'right',
      sortValue: (o) => o.custoInternoRsT,
      render: (o) => (
        <span className="font-mono text-ink-subtle" title={`Moinho ${getMoinho(o.moinhoId)?.nome ?? o.moinhoId}`}>
          {rs0(o.custoInternoRsT)}
        </span>
      ),
    },
    {
      key: 'margem',
      header: 'Margem',
      align: 'right',
      sortValue: (o) => o.margemRsT,
      render: (o) => (
        <span className="inline-flex items-center gap-1.5">
          {o.superaUsoInterno === true && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
              aria-label="supera o ganho de uso interno"
            />
          )}
          <span className={`font-mono font-semibold ${o.margemRsT > 0 ? 'text-ink' : 'text-danger'}`}>
            {rs1(o.margemRsT)}
          </span>
        </span>
      ),
    },
    {
      key: 'usointerno',
      header: 'Uso interno',
      align: 'right',
      sortValue: (o) => o.ganhoUsoInternoRsT ?? -9999,
      render: (o) => (
        <span className="font-mono text-ink-subtle">
          {o.ganhoUsoInternoRsT != null ? rs1(o.ganhoUsoInternoRsT) : '—'}
        </span>
      ),
    },
    {
      key: 'volume',
      header: 'Volume',
      align: 'right',
      sortValue: (o) => o.volumeT,
      render: (o) => <span className="font-mono">{formatTon(o.volumeT)}</span>,
    },
    {
      key: 'minimo',
      header: 'Preço mínimo',
      align: 'right',
      sortValue: (o) => o.precoMinimoRsT,
      render: (o) => <span className="font-mono text-ink-muted">{rs0(o.precoMinimoRsT)}</span>,
    },
    {
      key: 'capacidade',
      header: 'Capacidade',
      align: 'right',
      sortValue: (o) => o.capacidadeDisponivelT,
      render: (o) => (
        <span className="font-mono text-ink-muted">{formatTon(o.capacidadeDisponivelT)}</span>
      ),
    },
    {
      key: 'guardrail',
      header: 'Guardrail',
      align: 'left',
      sortValue: (o) => o.guardrail.volumeEmRupturaT,
      render: (o) => {
        const s = SEMAFORO[o.guardrail.semaforo]
        return (
          <WhyPopover
            titulo={`Guardrail — ${getClienteExterno(o.clienteId)!.nome}`}
            explicacao={o.guardrail.diagnostico}
            linhas={[
              { rotulo: 'Cabe na folga', valor: formatTon(o.guardrail.volumeSeguroT) },
              { rotulo: 'Sai do consumo interno', valor: formatTon(o.guardrail.volumeEmRupturaT) },
              { rotulo: 'Custo de reposição', valor: `${rs0(o.guardrail.custoReposicaoRsT)}/t` },
              {
                rotulo: 'Margem na folga',
                valor: `${rs1(o.guardrail.margemSeguraRsT)}/t`,
              },
              {
                rotulo: 'Margem em ruptura',
                valor: `${rs1(o.guardrail.margemComReposicaoRsT)}/t`,
              },
              {
                rotulo: 'Margem ponderada',
                valor: `${rs1(o.guardrail.margemPonderadaRsT)}/t`,
                destaque: true,
              },
            ]}
          >
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.classe}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${s.ponto}`} aria-hidden="true" />
              {s.rotulo}
            </span>
          </WhyPopover>
        )
      },
    },
    {
      key: 'status',
      header: 'Decisão',
      align: 'left',
      sortValue: (o) => o.status,
      render: (o) => (
        <Badge kind="status" label={ROTULO_STATUS[o.status]} tone={TOM_STATUS[o.status]} />
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Margem & Decisão"
        title="Oportunidades Comerciais"
        subtitle="Onde vender farinha rende mais que consumir nas fábricas — com o guardrail que impede a venda de romper o abastecimento interno."
        actions={<SourceBadge familia="estoque" />}
      />

      <AlertBanner rota="/oportunidades" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Margem das recomendadas"
          value={formatBRL(margemTotalRs, { compacto: true })}
          unit="/mês"
          hint={`${recomendadas.length} contas · ${formatTon(volumeTotalT)}`}
          fonte={
            <WhyPopover
              titulo="Margem das oportunidades recomendadas"
              explicacao="Soma da margem das contas aprovadas: preço líquido menos custo interno do moinho que atende, menos custo de servir. Contas em avaliar e recusar ficam de fora."
              linhas={recomendadas.map((o) => ({
                rotulo: getClienteExterno(o.clienteId)!.nome,
                valor: `${rs1(o.margemRsT)}/t · ${rs0(o.margemTotalRs)}`,
              }))}
              familia="estoque"
            />
          }
        />
        <KpiTile
          label="Superam o uso interno"
          value={String(superamInterno.length)}
          unit={`de ${OPORTUNIDADES_COMERCIAIS.length}`}
          hint="Vender rende mais que verticalizar a mesma tonelada"
          fonte={
            <WhyPopover
              titulo="A barra do uso interno"
              explicacao="Uma venda só vale mais que a verticalização quando a margem supera o ganho de consumir a mesma tonelada nas fábricas (preço externo menos custo interno). Sem cotação apples-to-apples da spec na região do moinho não existe barra a comparar, e a conta aparece sem base."
              linhas={OPORTUNIDADES_COMERCIAIS.map((o) => ({
                rotulo: getClienteExterno(o.clienteId)!.nome,
                valor:
                  o.ganhoUsoInternoRsT != null
                    ? `${rs1(o.margemRsT)} vs ${rs1(o.ganhoUsoInternoRsT)}`
                    : 'sem base',
              }))}
            />
          }
        />
        <KpiTile
          label="Volume em ruptura"
          value={formatTon(volumeEmRupturaT)}
          unit="/mês"
          delta={
            comRuptura.length > 0
              ? {
                  label: `${comRuptura.length} conta${comRuptura.length === 1 ? '' : 's'} afetada${comRuptura.length === 1 ? '' : 's'}`,
                  direction: 'down',
                  tone: 'danger',
                }
              : undefined
          }
          hint="Só seria atendido tirando farinha das fábricas"
        />
        <KpiTile
          label="Melhor margem unitária"
          value={rs1(melhor.margemRsT)}
          unit="/t"
          hint={`${getClienteExterno(melhor.clienteId)!.nome} · ${rotuloRegiao(melhor.regiao)}`}
        />
      </div>

      {/* Mapa + guardrail */}
      {/* O mapa ganhou linha própria: com o contorno real do Brasil, espremê-lo
          em 1,35fr deixava os rótulos de Centro-Oeste e Sudeste encavalados. */}
      <div className="space-y-4">
        <Card className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="eyebrow flex items-center gap-1.5">
                <MapIcon size={12} className="text-gold" aria-hidden="true" />
                Mapa de oportunidades
              </p>
              <h2 className="mt-1 font-display text-16 font-semibold text-ink">
                Onde a farinha vale mais fora
              </h2>
            </div>
            {regiao && (
              <button
                type="button"
                onClick={() => setRegiao(null)}
                className="rounded-full border border-edge px-3 py-1 text-11 font-semibold text-ink-muted transition-colors hover:border-edge-strong hover:text-ink"
              >
                Limpar filtro
              </button>
            )}
          </div>
          <OpsMap
            dados={regioes}
            selecionada={regiao}
            onSelecionar={setRegiao}
            ariaLabel="Mapa do Brasil por região comercial, com a melhor margem unitária de cada uma e o destino de exportação fora do continente. Os mesmos números estão na lista ao lado e na tabela abaixo, ambas navegáveis por teclado."
          />
        </Card>

        <Card variant={comRuptura.length > 0 ? 'alert' : 'default'} className="space-y-3">
          <div>
            <p className="eyebrow flex items-center gap-1.5">
              <ShieldAlert
                size={12}
                className={comRuptura.length > 0 ? 'text-danger' : 'text-gold'}
                aria-hidden="true"
              />
              Guardrail de ruptura
            </p>
            <h2 className="mt-1 font-display text-16 font-semibold text-ink">
              Quanto dá para vender sem faltar dentro
            </h2>
          </div>
          <p className="text-13 leading-relaxed text-ink-muted">
            Até a capacidade ociosa do moinho, vender é margem incremental pura. Acima dela, cada
            tonelada vendida sai do consumo próprio e obriga a{' '}
            <strong className="font-semibold text-ink">comprar farinha de terceiros para repor</strong>{' '}
            — e a margem dessa parcela passa a ser medida contra o preço de reposição, não contra o
            custo marginal.
          </p>
          <ul className="grid gap-2 lg:grid-cols-2">
            {comRuptura.map((o) => {
              const s = SEMAFORO[o.guardrail.semaforo]
              return (
                <li key={o.id} className="rounded-card border border-edge/60 bg-card-2 px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => abrirObjeto('oportunidade', o.id)}
                      className="truncate text-12 font-medium text-ink underline-offset-2 hover:text-gold-light hover:underline"
                    >
                      {getClienteExterno(o.clienteId)!.nome}
                    </button>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.classe}`}
                    >
                      {s.rotulo}
                    </span>
                  </div>
                  <p className="tnums mt-1 font-mono text-11 text-ink-subtle">
                    {formatTon(o.guardrail.volumeSeguroT)} na folga ·{' '}
                    <span className="text-danger">
                      {formatTon(o.guardrail.volumeEmRupturaT)} exigem reposição
                    </span>{' '}
                    a {rs0(o.guardrail.custoReposicaoRsT)}/t
                  </p>
                  <p className="mt-1 text-11 leading-relaxed text-ink-subtle">
                    {o.guardrail.diagnostico}
                  </p>
                </li>
              )
            })}
            {comRuptura.length === 0 && (
              <li className="rounded-card border border-positive/30 bg-positive/[0.06] px-3 py-3 text-12 text-ink-muted">
                Nenhuma oportunidade da carteira exige tirar farinha das fábricas: todas cabem na
                capacidade ociosa dos moinhos que as atendem.
              </li>
            )}
          </ul>
        </Card>
      </div>

      {/* Ranking */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-16 font-semibold text-ink">
            Ranking de oportunidades
            {regiao && (
              <span className="ml-2 text-13 font-medium text-ink-subtle">
                · {rotuloRegiao(regiao)}
              </span>
            )}
          </h2>
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Filtrar por canal"
          >
            {[{ id: 'todos' as const, rotulo: 'Todos os canais' }, ...CANAIS_FARINHA].map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setCanal(k.id as CanalFarinha | 'todos')}
                aria-pressed={canal === k.id}
                className={`rounded-full border px-3 py-1 text-11 font-semibold transition-colors ${
                  canal === k.id
                    ? 'border-gold/50 bg-gold/15 text-gold-light'
                    : 'border-edge bg-card-2 text-ink-subtle hover:border-edge-strong hover:text-ink'
                }`}
              >
                {k.rotulo}
              </button>
            ))}
          </div>
        </div>

        {oportunidades.length > 0 ? (
          <DataTable
            columns={colunas}
            rows={oportunidades}
            rowKey={(o) => o.id}
            minWidth={1180}
            caption="Oportunidades de venda de farinha por cliente, região e canal, com preço líquido, margem, ganho de uso interno, volume, preço mínimo, capacidade disponível e o guardrail de ruptura. Ordenável por qualquer coluna."
            /* A recusa vence o destaque: uma conta reprovada não pode aparecer
               pintada de dourado só porque a margem bateria o uso interno — o
               que a impede é o guardrail, não o preço. */
            rowClassName={(o) =>
              o.status === 'recusar'
                ? '[&>td]:bg-danger/[0.05]'
                : o.superaUsoInterno === true
                  ? '[&>td]:bg-gold/[0.07]'
                  : ''
            }
          />
        ) : (
          <Card>
            <p className="text-13 text-ink-muted">
              Nenhuma oportunidade nesta combinação de região e canal. Limpe o filtro para ver a
              carteira inteira.
            </p>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-11 text-ink-subtle">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-gold/25" aria-hidden="true" />
            Margem supera o uso interno (entre as contas não recusadas)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-danger/25" aria-hidden="true" />
            Recusada
          </span>
          <span>Clique no nome do cliente para abrir o detalhe da oportunidade.</span>
        </div>
      </div>

      {/* Ponte para o simulador */}
      <Card variant="gold" className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-1.5">
            <Handshake size={12} className="text-gold" aria-hidden="true" />
            Próximo passo
          </p>
          <p className="mt-1.5 max-w-2xl text-13 leading-relaxed text-ink-muted">
            O ranking mostra o que cada conta rende hoje. Para testar o que acontece com outro
            câmbio, outro custo de trigo ou outra capacidade — e ver se a venda continua batendo o
            uso interno —, leve o cenário ao simulador.
          </p>
        </div>
        <Link
          to="/make-buy-sell"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light"
        >
          Simular no Make/Buy/Sell
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </Card>
    </div>
  )
}
