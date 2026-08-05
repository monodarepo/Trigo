/**
 * Resolver de objetos (padrão "painel de objeto" estilo Foundry):
 * dado um {tipo, id}, monta a ficha completa — atributos, relacionados,
 * timeline, mini-gráfico e ações — a partir do snapshot existente.
 * Coerência total: o MV Río Paraná daqui é o MESMO dos alertas/cockpit.
 */
import { FORNECEDORES, MOINHOS, getFornecedor, getMoinho, getOrigem, getPorto } from './dominio'
import { CONTRATOS, EMBARQUES } from './logistica'
import { RECOMENDACOES_VRO } from './vro'
import { ESTOQUE_MOINHOS, RECOMENDACAO_COMPRA } from './compra'
import { ALTERNATIVAS_COMPRA, TLC_BASELINE_RS, TLC_RECOMENDADO_RS } from './tlc'
import { PRECOS_ATUAIS } from './mercado'
import { PREVISOES_ORIGEM } from './previsao'
import { formatBRL, formatDataPt, formatPct, formatTon, formatUSD } from './format'
import { OPORTUNIDADES_COMERCIAIS, getClienteExterno } from './comercial'
import { getFarinha } from './farinha'
import { custoInternoFarinha } from './economics'
import type { Embarque, OrigemId } from './types'

export type TipoObjeto =
  | 'navio'
  | 'contrato'
  | 'moinho'
  | 'origem'
  | 'porto'
  | 'fornecedor'
  | 'lote'
  | 'recomendacao'
  | 'oportunidade'

export type TomObjeto = 'neutro' | 'positivo' | 'atencao' | 'risco' | 'info'

export interface RefObjeto {
  tipo: TipoObjeto
  id: string
  rotulo: string
}

export interface AtributoObjeto {
  rotulo: string
  valor: string
  tom?: TomObjeto
  /** Explicação curta ("por quê") exibida em tooltip. */
  porque?: string
}

export interface EventoTimeline {
  data: string
  titulo: string
  descricao?: string
  tom?: TomObjeto
}

export type MiniGraficoObjeto =
  | { tipo: 'progresso'; rotulo: string; pct: number; esquerda: string; direita: string; tom: TomObjeto }
  | { tipo: 'medidor'; rotulo: string; pct: number; texto: string; tom: TomObjeto }
  | {
      tipo: 'barras'
      rotulo: string
      itens: Array<{ rotulo: string; valor: number; texto: string; tom: TomObjeto }>
    }
  | { tipo: 'sparkline'; rotulo: string; dados: readonly number[]; texto: string }

export interface AcaoObjeto {
  rotulo: string
  rota?: string
  toast?: string
}

export interface ObjetoDetalhe {
  ref: RefObjeto
  subtitulo?: string
  status: { rotulo: string; tom: TomObjeto }
  atributos: AtributoObjeto[]
  relacionados: Array<{ grupo: string; refs: RefObjeto[] }>
  timeline: EventoTimeline[]
  grafico?: MiniGraficoObjeto
  acoes: AcaoObjeto[]
}

const HOJE = '2025-08-12'
const dias = (a: string, b: string) => Math.round((+new Date(b) - +new Date(a)) / 86_400_000)
const fmtCambio = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`

// --- refs auxiliares ---
const refOrigem = (id: OrigemId): RefObjeto => ({ tipo: 'origem', id, rotulo: getOrigem(id)?.nome ?? id })
const refPorto = (id: string): RefObjeto => ({ tipo: 'porto', id, rotulo: `Porto de ${getPorto(id)?.nome ?? id}` })
const refMoinho = (id: string): RefObjeto => ({ tipo: 'moinho', id, rotulo: `Moinho ${getMoinho(id)?.nome ?? id}` })
const refFornecedor = (id: string): RefObjeto => ({ tipo: 'fornecedor', id, rotulo: getFornecedor(id)?.nome ?? id })
const refNavio = (e: Embarque): RefObjeto => ({ tipo: 'navio', id: e.id, rotulo: e.navio })
const refContrato = (id: string): RefObjeto => ({ tipo: 'contrato', id, rotulo: id.toUpperCase() })
const refLote = (id: string): RefObjeto => {
  const alt = ALTERNATIVAS_COMPRA.find((a) => a.id === id)
  return { tipo: 'lote', id, rotulo: alt ? `Lote ${getOrigem(alt.origemId)?.nome}` : id }
}

/** FOB atual (US$/t) por origem — comparador + curvas de previsão. */
function fobAtualUsd(origemId: OrigemId): number | null {
  const alt = ALTERNATIVAS_COMPRA.find((a) => a.origemId === origemId)
  if (alt?.fobUsd != null) return alt.fobUsd
  const prev = PREVISOES_ORIGEM.find((p) => p.origemId === origemId)
  return prev ? PRECOS_ATUAIS.cbotUsdT + prev.premioAtualUsdT : null
}

const STATUS_EMBARQUE: Record<Embarque['status'], { rotulo: string; tom: TomObjeto }> = {
  programado: { rotulo: 'Programado', tom: 'neutro' },
  'em-transito': { rotulo: 'Em trânsito', tom: 'info' },
  atrasado: { rotulo: 'Atrasado', tom: 'risco' },
  atracado: { rotulo: 'Atracado', tom: 'positivo' },
  descarregado: { rotulo: 'Descarregado', tom: 'neutro' },
}

function objetoNavio(id: string): ObjetoDetalhe | null {
  const e = EMBARQUES.find((x) => x.id === id)
  if (!e) return null
  const contrato = CONTRATOS.find((c) => c.id === e.contratoId)
  const status = STATUS_EMBARQUE[e.status]
  const embarcadoEm = contrato?.janelaEmbarque.fim ?? e.etaOriginal
  const total = Math.max(1, dias(embarcadoEm, e.etaAtual))
  const pct =
    e.status === 'atracado' ? 100 : e.status === 'programado' ? 0 : Math.min(96, Math.round((dias(embarcadoEm, HOJE) / total) * 100))

  const timeline: EventoTimeline[] = [
    ...(contrato
      ? [
          {
            data: contrato.janelaEmbarque.inicio,
            titulo: 'Janela de embarque aberta',
            descricao: `Contrato ${contrato.id.toUpperCase()} · ${formatTon(contrato.volumeToneladas)}`,
          },
          { data: contrato.janelaEmbarque.fim, titulo: 'Embarque concluído', tom: 'positivo' as TomObjeto },
        ]
      : []),
    ...(e.status === 'programado'
      ? []
      : [{ data: embarcadoEm, titulo: 'Em trânsito', descricao: `${getOrigem(e.origemId)?.nome} → ${getPorto(e.portoDestinoId)?.nome}` }]),
    ...(e.atrasoDias > 0
      ? [
          {
            data: HOJE,
            titulo: `ETA revisada +${e.atrasoDias} dias`,
            descricao: `Risco de demurrage de ${formatBRL(e.riscoDemurrageRs ?? 0, { compacto: true })}`,
            tom: 'risco' as TomObjeto,
          },
        ]
      : []),
    {
      data: e.etaAtual,
      titulo: e.status === 'atracado' ? 'Atracado no porto' : `ETA ${getPorto(e.portoDestinoId)?.nome}`,
      tom: e.atrasoDias > 0 ? ('atencao' as TomObjeto) : undefined,
    },
  ]

  return {
    ref: refNavio(e),
    subtitulo: `${getOrigem(e.origemId)?.nome} → ${getPorto(e.portoDestinoId)?.nome}/${getPorto(e.portoDestinoId)?.uf}`,
    status: e.atrasoDias > 0 ? { rotulo: `Atrasado +${e.atrasoDias} dias`, tom: 'risco' } : status,
    atributos: [
      { rotulo: 'Volume a bordo', valor: formatTon(e.volumeToneladas) },
      { rotulo: 'ETA original', valor: formatDataPt(e.etaOriginal) },
      {
        rotulo: 'ETA atual',
        valor: formatDataPt(e.etaAtual),
        tom: e.atrasoDias > 0 ? 'risco' : 'positivo',
        porque: e.atrasoDias > 0 ? 'Atraso na saída do Up River e fila de atracação' : undefined,
      },
      ...(e.riscoDemurrageRs
        ? [
            {
              rotulo: 'Demurrage em risco',
              valor: formatBRL(e.riscoDemurrageRs, { compacto: true }),
              tom: 'risco' as TomObjeto,
              porque: `${e.atrasoDias} dias além da janela × taxa diária do afretamento`,
            },
          ]
        : []),
      ...(contrato ? [{ rotulo: 'Preço FOB travado', valor: `US$ ${contrato.precoUsdT}/t · ${contrato.incoterm}` }] : []),
    ],
    relacionados: [
      {
        grupo: 'Cadeia',
        refs: [
          ...(contrato ? [refContrato(contrato.id), refFornecedor(contrato.fornecedorId)] : []),
          refOrigem(e.origemId),
          refPorto(e.portoDestinoId),
          ...(e.moinhoDestinoId ? [refMoinho(e.moinhoDestinoId)] : []),
        ],
      },
    ],
    timeline,
    grafico: {
      tipo: 'progresso',
      rotulo: 'Progresso da viagem',
      pct,
      esquerda: `embarque ${formatDataPt(embarcadoEm)}`,
      direita: `ETA ${formatDataPt(e.etaAtual)}`,
      tom: e.atrasoDias > 0 ? 'risco' : 'info',
    },
    acoes: [
      { rotulo: 'Abrir no TLC', rota: '/tlc' },
      ...(e.atrasoDias > 0
        ? [
            { rotulo: 'Ver alertas', rota: '/alertas' },
            { rotulo: 'Priorizar atracação', toast: 'Priorização de atracação solicitada à operação portuária' },
          ]
        : []),
    ],
  }
}

function objetoContrato(id: string): ObjetoDetalhe | null {
  const c = CONTRATOS.find((x) => x.id === id)
  if (!c) return null
  const embarque = EMBARQUES.find((e) => e.contratoId === c.id)
  const fobMercado = fobAtualUsd(c.origemId)
  const deltaMercado = fobMercado != null ? c.precoUsdT - fobMercado : null
  return {
    ref: refContrato(c.id),
    subtitulo: `${getFornecedor(c.fornecedorId)?.nome} · ${getOrigem(c.origemId)?.nome}`,
    status:
      c.status === 'ativo'
        ? { rotulo: 'Ativo', tom: 'info' }
        : c.status === 'planejado'
          ? { rotulo: 'Planejado', tom: 'neutro' }
          : { rotulo: 'Executado', tom: 'positivo' },
    atributos: [
      { rotulo: 'Volume', valor: formatTon(c.volumeToneladas) },
      {
        rotulo: 'Preço travado',
        valor: `US$ ${c.precoUsdT}/t ${c.incoterm}`,
        tom: deltaMercado != null && deltaMercado < 0 ? 'positivo' : 'neutro',
        porque:
          deltaMercado != null
            ? `${deltaMercado < 0 ? 'Abaixo' : 'Acima'} do FOB de mercado atual (US$ ${fobMercado}/t)`
            : undefined,
      },
      { rotulo: 'Valor do contrato', valor: formatUSD(c.volumeToneladas * c.precoUsdT, { compacto: true }) },
      { rotulo: 'Janela de embarque', valor: `${formatDataPt(c.janelaEmbarque.inicio)} – ${formatDataPt(c.janelaEmbarque.fim)}` },
      { rotulo: 'Câmbio de referência', valor: fmtCambio(PRECOS_ATUAIS.cambioBrlUsd) },
    ],
    relacionados: [
      {
        grupo: 'Cadeia',
        refs: [
          refFornecedor(c.fornecedorId),
          refOrigem(c.origemId),
          refPorto(c.portoDestinoId),
          ...(embarque ? [refNavio(embarque)] : []),
        ],
      },
    ],
    timeline: [
      { data: c.janelaEmbarque.inicio, titulo: 'Janela de embarque aberta' },
      { data: c.janelaEmbarque.fim, titulo: 'Fim da janela contratual' },
      ...(embarque
        ? [
            {
              data: embarque.etaAtual,
              titulo: `${embarque.navio}: ${STATUS_EMBARQUE[embarque.status].rotulo}`,
              tom: embarque.atrasoDias > 0 ? ('risco' as TomObjeto) : undefined,
            },
          ]
        : []),
    ],
    grafico:
      fobMercado != null
        ? {
            tipo: 'barras',
            rotulo: 'Preço travado vs mercado (US$/t FOB)',
            itens: [
              { rotulo: 'Travado', valor: c.precoUsdT, texto: `US$ ${c.precoUsdT}`, tom: 'info' },
              { rotulo: 'Mercado hoje', valor: fobMercado, texto: `US$ ${fobMercado}`, tom: deltaMercado! <= 0 ? 'positivo' : 'risco' },
            ],
          }
        : undefined,
    acoes: [{ rotulo: 'Ver comparador no TLC', rota: '/tlc' }],
  }
}

function objetoMoinho(id: string): ObjetoDetalhe | null {
  const m = getMoinho(id)
  const estoque = ESTOQUE_MOINHOS.find((e) => e.moinhoId === id)
  if (!m || !estoque) return null
  const abaixo = estoque.coberturaDias < estoque.politicaMinimaDias
  const consumoDia = Math.round((m.capacidadeAnualKt * 1000) / 330)
  const alocacao = RECOMENDACAO_COMPRA.distribuicaoMoinhos.find((d) => d.moinhoId === id)
  const navioACaminho = EMBARQUES.find((e) => e.moinhoDestinoId === id && e.status !== 'descarregado')
  return {
    ref: refMoinho(id),
    subtitulo: `${m.cidade}/${m.uf} · perfil: ${m.perfilProduto.join(' + ')}`,
    status: abaixo
      ? { rotulo: `Abaixo da política (${estoque.coberturaDias}d < ${estoque.politicaMinimaDias}d)`, tom: 'risco' }
      : { rotulo: 'Dentro da política', tom: 'positivo' },
    atributos: [
      { rotulo: 'Capacidade anual', valor: `${m.capacidadeAnualKt} kt` },
      { rotulo: 'Consumo diário', valor: `${consumoDia.toLocaleString('pt-BR')} t/dia`, porque: 'Capacidade anual ÷ 330 dias úteis' },
      { rotulo: 'Estoque atual', valor: formatTon(estoque.estoqueToneladas) },
      {
        rotulo: 'Cobertura',
        valor: `${estoque.coberturaDias} dias`,
        tom: abaixo ? 'risco' : 'positivo',
        porque: abaixo ? 'Consumo acima do plano e reposição atrasada' : undefined,
      },
      { rotulo: 'Política mínima', valor: `${estoque.politicaMinimaDias} dias` },
      ...(alocacao
        ? [
            {
              rotulo: 'Alocação recomendada',
              valor: `${formatTon(alocacao.toneladas)} → ${alocacao.coberturaAposDias}d`,
              tom: 'positivo' as TomObjeto,
              porque: 'Parcela da compra de 32.000 t do dia destinada a este moinho',
            },
          ]
        : []),
    ],
    relacionados: [
      {
        grupo: 'Cadeia',
        refs: [refPorto(m.portoPreferencialId), ...(navioACaminho ? [refNavio(navioACaminho)] : [])],
      },
    ],
    timeline: [
      ...(abaixo
        ? [{ data: '2025-08-11', titulo: 'Cobertura abaixo da política', descricao: `${estoque.coberturaDias} dias vs mínimo de ${estoque.politicaMinimaDias}`, tom: 'risco' as TomObjeto }]
        : []),
      ...(alocacao
        ? [{ data: HOJE, titulo: 'Alocação na compra recomendada', descricao: `${formatTon(alocacao.toneladas)} · cobertura vai a ${alocacao.coberturaAposDias} dias`, tom: 'positivo' as TomObjeto }]
        : []),
      ...(navioACaminho
        ? [{ data: navioACaminho.etaAtual, titulo: `Descarga prevista — ${navioACaminho.navio}`, tom: navioACaminho.atrasoDias > 0 ? ('atencao' as TomObjeto) : undefined }]
        : []),
    ],
    grafico: {
      tipo: 'medidor',
      rotulo: 'Cobertura vs política',
      pct: Math.min(130, Math.round((estoque.coberturaDias / estoque.politicaMinimaDias) * 100)),
      texto: `${estoque.coberturaDias}d / ${estoque.politicaMinimaDias}d`,
      tom: abaixo ? 'risco' : 'positivo',
    },
    acoes: [
      { rotulo: 'Recompor cobertura', rota: '/compra' },
      { rotulo: 'Ver alertas', rota: '/alertas' },
    ],
  }
}

function objetoOrigem(id: string): ObjetoDetalhe | null {
  const o = getOrigem(id)
  if (!o) return null
  const alt = ALTERNATIVAS_COMPRA.find((a) => a.origemId === o.id)
  const prev = PREVISOES_ORIGEM.find((p) => p.origemId === o.id)
  const fob = fobAtualUsd(o.id)
  const embarques = EMBARQUES.filter((e) => e.origemId === o.id && e.status !== 'descarregado')
  const fornecedores = FORNECEDORES.filter((f) => f.origemId === o.id)
  return {
    ref: refOrigem(o.id),
    subtitulo: `${o.pais} · ${o.classeTrigo}`,
    status: o.mercosul
      ? { rotulo: 'Mercosul — imposto 0%', tom: 'positivo' }
      : { rotulo: 'Extra-Mercosul — imposto 10%', tom: 'atencao' },
    atributos: [
      ...(fob != null ? [{ rotulo: 'FOB atual', valor: `US$ ${fob}/t`, porque: `CBOT US$ ${PRECOS_ATUAIS.cbotUsdT} + prêmio de origem` }] : []),
      { rotulo: 'Faixa de W', valor: `${o.faixaW[0]}–${o.faixaW[1]}` },
      { rotulo: 'Proteína típica', valor: `${o.faixaProteina[0]}–${o.faixaProteina[1]}%` },
      { rotulo: 'Trânsito marítimo', valor: o.transitoDias > 0 ? `${o.transitoDias} dias` : 'doméstico' },
      ...(alt
        ? [
            {
              rotulo: 'TLC no comparador',
              valor: `${formatBRL(alt.tlcRs)}/t`,
              tom: alt.recomendada ? ('positivo' as TomObjeto) : undefined,
              porque: alt.recomendada ? 'Alternativa recomendada do dia' : alt.observacao,
            },
            {
              rotulo: 'Atende especificação',
              valor: alt.atendeEspec ? 'Sim' : 'Não',
              tom: alt.atendeEspec ? ('positivo' as TomObjeto) : ('risco' as TomObjeto),
              porque: alt.atendeEspec ? undefined : alt.observacao,
            },
          ]
        : []),
    ],
    relacionados: [
      { grupo: 'Fornecedores', refs: fornecedores.map((f) => refFornecedor(f.id)) },
      { grupo: 'Embarques', refs: embarques.map(refNavio) },
      ...(alt ? [{ grupo: 'Comparador', refs: [refLote(alt.id)] }] : []),
    ],
    timeline: embarques.map((e) => ({
      data: e.etaAtual,
      titulo: `${e.navio} — ${STATUS_EMBARQUE[e.status].rotulo}`,
      descricao: `${formatTon(e.volumeToneladas)} → ${getPorto(e.portoDestinoId)?.nome}`,
      tom: e.atrasoDias > 0 ? ('risco' as TomObjeto) : undefined,
    })),
    grafico: prev
      ? {
          tipo: 'sparkline',
          rotulo: 'FOB projetado (90 dias)',
          dados: prev.projecao.map((p) => p.valor),
          texto: `US$ ${prev.projecao[0].valor} → US$ ${prev.projecao[prev.projecao.length - 1].valor}/t`,
        }
      : alt
        ? {
            tipo: 'barras',
            rotulo: 'TLC vs baseline (R$/t)',
            itens: [
              { rotulo: 'Este lote', valor: alt.tlcRs, texto: formatBRL(alt.tlcRs), tom: alt.deltaVsBaselineRs <= 0 ? 'positivo' : 'risco' },
              { rotulo: 'Baseline', valor: TLC_BASELINE_RS, texto: formatBRL(TLC_BASELINE_RS), tom: 'neutro' },
            ],
          }
        : undefined,
    acoes: [
      { rotulo: 'Comparar no TLC', rota: '/tlc' },
      { rotulo: 'Simular restrição', rota: '/simulador' },
    ],
  }
}

function objetoPorto(id: string): ObjetoDetalhe | null {
  const p = getPorto(id)
  if (!p) return null
  const inbound = EMBARQUES.filter((e) => e.portoDestinoId === p.id && e.status !== 'descarregado')
  const volumeInbound = inbound.reduce((s, e) => s + e.volumeToneladas, 0)
  const utilizacaoPct = Math.round((volumeInbound / (p.capacidadeMensalKt * 1000)) * 100)
  const moinhosServidos = MOINHOS.filter((m) => m.portoPreferencialId === p.id)
  return {
    ref: refPorto(p.id),
    subtitulo: `${p.nome}/${p.uf} · capacidade ${p.capacidadeMensalKt} kt/mês`,
    status:
      p.filaNavios >= 2
        ? { rotulo: `Fila de ${p.filaNavios} navios`, tom: 'atencao' }
        : p.filaNavios === 1
          ? { rotulo: 'Fila de 1 navio', tom: 'info' }
          : { rotulo: 'Sem fila', tom: 'positivo' },
    atributos: [
      { rotulo: 'Fila atual', valor: `${p.filaNavios} navio(s)`, tom: p.filaNavios >= 2 ? 'atencao' : undefined },
      {
        rotulo: 'Custo portuário',
        valor: `${formatBRL(p.custoPortuarioRsT, { casas: 1 })}/t`,
        porque: 'Componente "despesas portuárias" do TLC',
      },
      { rotulo: 'Navios a caminho', valor: String(inbound.length) },
      { rotulo: 'Volume em rota', valor: formatTon(volumeInbound) },
      {
        rotulo: 'Demurrage-risco (TLC)',
        valor: `${formatBRL(1.2 + 2.3 * p.filaNavios, { casas: 1 })}/t`,
        porque: 'Função da fila: R$ 1,20 + R$ 2,30 × navios na fila',
      },
    ],
    relacionados: [
      { grupo: 'Navios a caminho', refs: inbound.map(refNavio) },
      { grupo: 'Moinhos servidos', refs: moinhosServidos.map((m) => refMoinho(m.id)) },
    ],
    timeline: inbound
      .slice()
      .sort((a, b) => a.etaAtual.localeCompare(b.etaAtual))
      .map((e) => ({
        data: e.etaAtual,
        titulo: `ETA ${e.navio}`,
        descricao: formatTon(e.volumeToneladas),
        tom: e.atrasoDias > 0 ? ('risco' as TomObjeto) : undefined,
      })),
    grafico: {
      tipo: 'medidor',
      rotulo: 'Utilização da capacidade mensal',
      pct: utilizacaoPct,
      texto: `${formatTon(volumeInbound)} / ${p.capacidadeMensalKt} kt (${formatPct(utilizacaoPct)})`,
      tom: utilizacaoPct > 80 ? 'atencao' : 'info',
    },
    acoes: [{ rotulo: 'Ver TLC por este porto', rota: '/tlc' }],
  }
}

function objetoFornecedor(id: string): ObjetoDetalhe | null {
  const f = getFornecedor(id)
  if (!f) return null
  const contratos = CONTRATOS.filter((c) => c.fornecedorId === f.id)
  const contratado = contratos.reduce((s, c) => s + c.volumeToneladas, 0)
  const alt = ALTERNATIVAS_COMPRA.find((a) => a.fornecedorId === f.id)
  return {
    ref: refFornecedor(f.id),
    subtitulo: `${getOrigem(f.origemId)?.nome} · rating ${f.rating}`,
    status:
      f.rating === 'A' ? { rotulo: 'Rating A — preferencial', tom: 'positivo' } : { rotulo: `Rating ${f.rating}`, tom: 'info' },
    atributos: [
      { rotulo: 'Volume anual', valor: `${f.volumeAnualKt} kt` },
      { rotulo: 'Contratos no sistema', valor: String(contratos.length) },
      { rotulo: 'Volume contratado', valor: formatTon(contratado) },
      ...(alt
        ? [
            {
              rotulo: 'Disponível na janela',
              valor: formatTon(alt.volumeDisponivelToneladas),
              porque: 'Oferta firme para a janela de 5 dias do comparador',
            },
          ]
        : []),
    ],
    relacionados: [
      { grupo: 'Origem', refs: [refOrigem(f.origemId)] },
      { grupo: 'Contratos', refs: contratos.map((c) => refContrato(c.id)) },
      ...(alt ? [{ grupo: 'Comparador', refs: [refLote(alt.id)] }] : []),
    ],
    timeline: contratos.map((c) => ({
      data: c.janelaEmbarque.inicio,
      titulo: `${c.id.toUpperCase()} · ${formatTon(c.volumeToneladas)}`,
      descricao: `US$ ${c.precoUsdT}/t ${c.incoterm} → ${getPorto(c.portoDestinoId)?.nome}`,
    })),
    grafico: alt
      ? {
          tipo: 'barras',
          rotulo: 'Volumes (t)',
          itens: [
            { rotulo: 'Contratado', valor: contratado, texto: formatTon(contratado), tom: 'info' },
            { rotulo: 'Disponível na janela', valor: alt.volumeDisponivelToneladas, texto: formatTon(alt.volumeDisponivelToneladas), tom: 'positivo' },
          ],
        }
      : undefined,
    acoes: [{ rotulo: 'Ver comparador no TLC', rota: '/tlc' }],
  }
}

function objetoLote(id: string): ObjetoDetalhe | null {
  const a = ALTERNATIVAS_COMPRA.find((x) => x.id === id)
  if (!a) return null
  const donAlto = a.qualidade.don > 1000
  return {
    ref: refLote(a.id),
    subtitulo: `${getFornecedor(a.fornecedorId)?.nome}${a.portoId ? ` · via ${getPorto(a.portoId)?.nome}` : ' · rodoviário'}`,
    status: a.recomendada
      ? { rotulo: 'Recomendado (menor TLC que atende espec.)', tom: 'positivo' }
      : a.atendeEspec
        ? { rotulo: 'Alternativa viável', tom: 'info' }
        : { rotulo: 'Não atende especificação', tom: 'risco' },
    atributos: [
      ...(a.fobUsd != null ? [{ rotulo: 'FOB', valor: `US$ ${a.fobUsd}/t` }] : []),
      ...(a.freteUsd != null ? [{ rotulo: 'Frete marítimo', valor: `US$ ${a.freteUsd}/t` }] : []),
      { rotulo: 'Imposto de importação', valor: formatPct(a.impostoPct), tom: a.impostoPct > 0 ? 'atencao' : 'positivo' },
      {
        rotulo: 'TLC',
        valor: `${formatBRL(a.tlcRs)}/t`,
        tom: a.recomendada ? 'positivo' : undefined,
        porque: 'Custo total landed ajustado ao risco — soma dos 12 componentes',
      },
      {
        rotulo: 'Δ vs baseline',
        valor: `${a.deltaVsBaselineRs < 0 ? '−' : '+'}${formatBRL(Math.abs(a.deltaVsBaselineRs))}/t`,
        tom: a.deltaVsBaselineRs <= 0 ? 'positivo' : 'risco',
      },
      { rotulo: 'Volume disponível', valor: formatTon(a.volumeDisponivelToneladas) },
      { rotulo: 'Qualidade', valor: `prot. ${a.qualidade.proteina}% · W ${a.qualidade.w} · FN ${a.qualidade.fallingNumber}` },
      {
        rotulo: 'DON',
        valor: `${a.qualidade.don.toLocaleString('pt-BR')} ppb`,
        tom: donAlto ? 'risco' : 'positivo',
        porque: donAlto ? 'Acima da política para biscoito (≤ 1.000 ppb)' : 'Dentro da política (≤ 1.000 ppb p/ biscoito)',
      },
    ],
    relacionados: [
      {
        grupo: 'Cadeia',
        refs: [refOrigem(a.origemId), ...(a.portoId ? [refPorto(a.portoId)] : []), refFornecedor(a.fornecedorId)],
      },
    ],
    timeline: [
      { data: HOJE, titulo: a.recomendada ? 'Selecionado pelo otimizador' : 'Avaliado pelo otimizador', descricao: a.observacao, tom: a.recomendada ? 'positivo' : undefined },
    ],
    grafico: {
      tipo: 'barras',
      rotulo: 'TLC (R$/t)',
      itens: [
        { rotulo: 'Este lote', valor: a.tlcRs, texto: formatBRL(a.tlcRs), tom: a.recomendada ? 'positivo' : a.deltaVsBaselineRs > 0 ? 'risco' : 'info' },
        { rotulo: 'Recomendado', valor: TLC_RECOMENDADO_RS, texto: formatBRL(TLC_RECOMENDADO_RS), tom: 'positivo' },
        { rotulo: 'Baseline', valor: TLC_BASELINE_RS, texto: formatBRL(TLC_BASELINE_RS), tom: 'neutro' },
      ],
    },
    acoes: [
      { rotulo: 'Comparar no TLC', rota: '/tlc' },
      { rotulo: 'Ver recomendação', rota: '/compra' },
    ],
  }
}

const TOM_DECISAO: Record<string, { rotulo: string; tom: TomObjeto }> = {
  aprovada: { rotulo: 'Aprovada', tom: 'positivo' },
  ajustada: { rotulo: 'Ajustada', tom: 'atencao' },
  rejeitada: { rotulo: 'Rejeitada', tom: 'risco' },
  pendente: { rotulo: 'Em aprovação', tom: 'info' },
}

function objetoRecomendacao(id: string): ObjetoDetalhe | null {
  const r = RECOMENDACOES_VRO.find((x) => x.id === id)
  if (!r) return null
  const decisao = TOM_DECISAO[r.decisaoHumana]
  const total = r.valorCpvRs + r.valorHedgeRs
  return {
    ref: { tipo: 'recomendacao', id: r.id, rotulo: r.titulo },
    subtitulo: r.recomendacaoIA,
    status: decisao,
    atributos: [
      { rotulo: 'Data', valor: formatDataPt(r.data, { comAno: true }) },
      { rotulo: 'Alavanca', valor: r.alavanca.replace('-', ' / ') },
      {
        rotulo: 'Decisão humana',
        valor: decisao.rotulo,
        tom: decisao.tom,
        porque: r.decisaoNota,
      },
      { rotulo: 'Confiança da IA', valor: formatPct(r.confiancaPct) },
      {
        rotulo: 'Valor no CPV',
        valor: `${r.valorCpvRs < 0 ? '−' : ''}${formatBRL(Math.abs(r.valorCpvRs), { compacto: true })}`,
        tom: r.valorCpvRs < 0 ? 'risco' : r.valorCpvRs > 0 ? 'positivo' : 'neutro',
        porque: 'Δ vs baseline medido no fechamento — haircut de 15–20% aplicado',
      },
      ...(r.valorHedgeRs > 0
        ? [
            {
              rotulo: 'Protegido por hedge',
              valor: formatBRL(r.valorHedgeRs, { compacto: true }),
              tom: 'positivo' as TomObjeto,
              porque: 'Notional × (câmbio realizado − taxa travada)',
            },
          ]
        : []),
      { rotulo: 'Status', valor: r.status === 'realizado' ? 'Resultado medido' : 'Projetado' },
    ],
    relacionados: [],
    timeline: [
      { data: r.data, titulo: 'Recomendada pela IA', descricao: r.recomendacaoIA },
      { data: r.data, titulo: `Decisão humana: ${decisao.rotulo}`, descricao: r.decisaoNota, tom: decisao.tom },
      {
        data: r.data,
        titulo: r.status === 'realizado' ? 'Resultado medido' : 'Resultado projetado',
        descricao: r.resultado,
        tom: total > 0 ? 'positivo' : r.valorCpvRs < 0 ? 'risco' : 'neutro',
      },
    ],
    grafico:
      total !== 0
        ? {
            tipo: 'barras',
            rotulo: 'Valor atribuído (R$)',
            itens: [
              ...(r.valorCpvRs !== 0
                ? [
                    {
                      rotulo: 'CPV',
                      valor: Math.abs(r.valorCpvRs),
                      texto: formatBRL(r.valorCpvRs, { compacto: true }),
                      tom: r.valorCpvRs < 0 ? ('risco' as TomObjeto) : ('positivo' as TomObjeto),
                    },
                  ]
                : []),
              ...(r.valorHedgeRs > 0
                ? [
                    {
                      rotulo: 'Hedge',
                      valor: r.valorHedgeRs,
                      texto: formatBRL(r.valorHedgeRs, { compacto: true }),
                      tom: 'info' as TomObjeto,
                    },
                  ]
                : []),
            ],
          }
        : undefined,
    acoes: [
      { rotulo: 'Ver metodologia no VRO', rota: '/vro' },
      ...(r.status === 'projetado' ? [{ rotulo: 'Abrir recomendação do dia', rota: '/compra' }] : []),
    ],
  }
}


const ROTULO_CANAL: Record<string, string> = {
  industrial: 'Industrial',
  panificacao: 'Panificação',
  distribuidor: 'Distribuidor',
  varejo: 'Varejo',
}

const ROTULO_APRESENTACAO: Record<string, string> = {
  granel: 'Granel',
  'big-bag': 'Big-bag',
  'saco-25kg': 'Saco 25 kg',
  'saco-1kg': 'Saco 1 kg',
}

/**
 * Detalhe de uma oportunidade comercial: spec ofertada, condição comercial,
 * logística e a margem líquida DECOMPOSTA — preço menos custo interno menos
 * custo de servir, com o guardrail de ruptura ao lado.
 */
function objetoOportunidade(id: string): ObjetoDetalhe | null {
  const op = OPORTUNIDADES_COMERCIAIS.find((o) => o.id === id)
  if (!op) return null
  const cliente = getClienteExterno(op.clienteId)!
  const farinha = getFarinha(op.farinhaId)!
  const moinho = getMoinho(op.moinhoId)!
  const custo = custoInternoFarinha(op.moinhoId, op.farinhaId)
  const g = op.guardrail

  const tomStatus: TomObjeto =
    op.status === 'recomendada' ? 'positivo' : op.status === 'avaliar' ? 'atencao' : 'risco'
  const tomSemaforo: TomObjeto =
    g.semaforo === 'seguro' ? 'positivo' : g.semaforo === 'atencao' ? 'atencao' : 'risco'
  const rsT = (v: number) => `${formatBRL(v, { casas: 1 })}/t`

  return {
    ref: { tipo: 'oportunidade', id: op.id, rotulo: cliente.nome },
    subtitulo: `${farinha.nome} · ${ROTULO_CANAL[op.canal] ?? op.canal} · ${formatTon(op.volumeT)}/mês`,
    status: {
      rotulo:
        op.status === 'recomendada' ? 'Recomendada' : op.status === 'avaliar' ? 'Avaliar' : 'Recusar',
      tom: tomStatus,
    },
    atributos: [
      { rotulo: 'Cliente', valor: `${cliente.nome} · rating ${cliente.rating}` },
      { rotulo: 'Região', valor: op.regiao === 'exportacao' ? 'Exportação' : op.regiao },
      {
        rotulo: 'Spec ofertada',
        valor: `proteína ${formatPct(farinha.proteina, 1)} · W ${farinha.gluten} · cinzas ${formatPct(farinha.cinzas, 2)}`,
        porque: `Blend de referência: ${farinha.blendReferencia}.`,
      },
      {
        rotulo: 'Apresentação',
        valor: ROTULO_APRESENTACAO[op.apresentacao] ?? op.apresentacao,
      },
      {
        rotulo: 'Logística',
        valor:
          op.apresentacao === 'granel'
            ? `FOB moinho ${moinho.nome}`
            : `Entregue ao cliente (CIF) · saída de ${moinho.nome}`,
        porque: 'A base logística define o que está dentro do preço e o que vira custo de servir.',
      },
      {
        rotulo: 'Condição comercial',
        valor: `${cliente.prazoDias} dias · relacionamento de ${cliente.relacionamentoAnos} ano(s)`,
      },
      { rotulo: 'Preço líquido', valor: rsT(op.precoLiquidoRsT) },
      {
        rotulo: '(−) Custo interno',
        valor: rsT(op.custoInternoRsT),
        porque: `Trigo a ${rsT(custo.tlcTrigoRsT)} posto em ${moinho.nome}, rendimento de ${formatPct(custo.rendimentoPct, 1)}.`,
      },
      {
        rotulo: '(−) Custo de servir',
        valor: rsT(op.custoServirRsT),
        porque: 'Frete até o cliente, comissão, embalagem e risco de crédito.',
      },
      {
        rotulo: '= Margem líquida',
        valor: rsT(op.margemRsT),
        tom: op.margemRsT > 0 ? 'positivo' : 'risco',
      },
      {
        rotulo: 'Preço mínimo',
        valor: rsT(op.precoMinimoRsT),
        porque: 'Abaixo disso a venda não cobre custo interno mais custo de servir.',
      },
      {
        rotulo: 'Ganho de uso interno',
        valor: op.ganhoUsoInternoRsT != null ? rsT(op.ganhoUsoInternoRsT) : 'sem base comparável',
        tom: op.superaUsoInterno === true ? 'positivo' : op.superaUsoInterno === false ? 'atencao' : 'neutro',
        porque:
          op.ganhoUsoInternoRsT != null
            ? 'A barra que a venda precisa superar: o que a mesma tonelada renderia consumida nas fábricas.'
            : 'Não há cotação apples-to-apples desta spec na região do moinho, então não existe barra a comparar.',
      },
      {
        rotulo: 'Guardrail de ruptura',
        valor:
          g.volumeEmRupturaT === 0
            ? `${formatTon(g.volumeSeguroT)} sem ruptura`
            : `${formatTon(g.volumeEmRupturaT)} em ruptura`,
        tom: tomSemaforo,
        porque: g.diagnostico,
      },
    ],
    relacionados: [
      { grupo: 'Produção', refs: [refMoinho(op.moinhoId)] },
    ],
    timeline: [
      {
        data: HOJE,
        titulo: 'Oportunidade avaliada pelo hub',
        descricao: op.racional,
        tom: tomStatus,
      },
    ],
    grafico: {
      tipo: 'barras',
      rotulo: 'Composição do preço líquido (R$/t)',
      itens: [
        {
          rotulo: 'Custo interno',
          valor: op.custoInternoRsT,
          texto: rsT(op.custoInternoRsT),
          tom: 'neutro',
        },
        {
          rotulo: 'Custo de servir',
          valor: op.custoServirRsT,
          texto: rsT(op.custoServirRsT),
          tom: 'info',
        },
        {
          rotulo: 'Margem',
          valor: Math.max(0, op.margemRsT),
          texto: rsT(op.margemRsT),
          tom: op.margemRsT > 0 ? 'positivo' : 'risco',
        },
      ],
    },
    acoes: [
      { rotulo: 'Simular no Make/Buy/Sell', rota: '/make-buy-sell' },
      { rotulo: 'Ver performance do moinho', rota: '/moinhos' },
    ],
  }
}

export function resolverObjeto(ref: Pick<RefObjeto, 'tipo' | 'id'>): ObjetoDetalhe | null {
  switch (ref.tipo) {
    case 'navio':
      return objetoNavio(ref.id)
    case 'contrato':
      return objetoContrato(ref.id)
    case 'moinho':
      return objetoMoinho(ref.id)
    case 'origem':
      return objetoOrigem(ref.id)
    case 'porto':
      return objetoPorto(ref.id)
    case 'fornecedor':
      return objetoFornecedor(ref.id)
    case 'lote':
      return objetoLote(ref.id)
    case 'recomendacao':
      return objetoRecomendacao(ref.id)
    case 'oportunidade':
      return objetoOportunidade(ref.id)
  }
}

export const ROTULO_TIPO: Record<TipoObjeto, string> = {
  navio: 'Navio',
  contrato: 'Contrato',
  moinho: 'Moinho',
  origem: 'Origem',
  porto: 'Porto',
  fornecedor: 'Fornecedor',
  lote: 'Lote',
  recomendacao: 'Recomendação',
  oportunidade: 'Oportunidade',
}
