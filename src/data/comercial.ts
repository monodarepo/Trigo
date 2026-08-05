/**
 * Elo 4 — COMERCIAL: clientes de farinha e oportunidades de venda externa.
 *
 * Toda margem aqui é CALCULADA pelo motor econômico (margemVendaExterna), não
 * digitada: preço líquido − custo interno do moinho que atende − custo de
 * servir. Mudou o TLC do trigo, mudou a margem da conta — é a mesma verdade
 * atravessando compra, moagem e venda.
 */
import type {
  ApresentacaoFarinha,
  CanalFarinha,
  ClienteExterno,
  FarinhaId,
  GuardrailRuptura,
  MoinhoId,
  OportunidadeComercial,
  RegiaoComercial,
  SemaforoRuptura,
  StatusOportunidade,
} from './types'
import { regiaoDoMoinho } from './dominio'
import { precoExternoComparavel } from './farinha'
import {
  capacidadeOciosaFarinhaT,
  custoInternoFarinha,
  ganhoVerticalizacao,
  margemVendaExterna,
} from './economics'

const arred1 = (v: number) => Math.round(v * 10) / 10

export const CLIENTES_EXTERNOS: ClienteExterno[] = [
  {
    id: 'massas-cearenses',
    nome: 'Massas Cearenses S.A.',
    regiao: 'nordeste',
    canal: 'industrial',
    rating: 'A',
    volumeMensalT: 2200,
    prazoDias: 21,
    relacionamentoAnos: 9,
  },
  {
    id: 'panificadora-nordeste',
    nome: 'Panificadora Nordeste Ltda',
    regiao: 'nordeste',
    canal: 'panificacao',
    rating: 'B',
    volumeMensalT: 900,
    prazoDias: 28,
    relacionamentoAnos: 6,
  },
  {
    id: 'distribuidora-sertao',
    nome: 'Distribuidora Sertão',
    regiao: 'nordeste',
    canal: 'distribuidor',
    rating: 'B',
    volumeMensalT: 1400,
    prazoDias: 35,
    relacionamentoAnos: 4,
  },
  {
    id: 'rede-pao-bahia',
    nome: 'Rede Pão Bahia',
    regiao: 'nordeste',
    canal: 'panificacao',
    rating: 'C',
    volumeMensalT: 650,
    prazoDias: 42,
    relacionamentoAnos: 2,
  },
  {
    id: 'alimentos-sul',
    nome: 'Alimentos Sul S.A.',
    regiao: 'sul',
    canal: 'industrial',
    rating: 'A',
    volumeMensalT: 1800,
    prazoDias: 30,
    relacionamentoAnos: 3,
  },
  {
    id: 'varejo-norte',
    nome: 'Varejo Norte Atacado',
    regiao: 'norte',
    canal: 'distribuidor',
    rating: 'B',
    volumeMensalT: 1100,
    prazoDias: 45,
    relacionamentoAnos: 5,
  },
  {
    id: 'biscoitos-paulista',
    nome: 'Biscoitos Paulista S.A.',
    regiao: 'sudeste',
    canal: 'industrial',
    rating: 'A',
    volumeMensalT: 1900,
    prazoDias: 28,
    relacionamentoAnos: 7,
  },
  {
    id: 'panificio-cerrado',
    nome: 'Panifício Cerrado',
    regiao: 'centro-oeste',
    canal: 'panificacao',
    rating: 'B',
    volumeMensalT: 700,
    prazoDias: 30,
    relacionamentoAnos: 3,
  },
  {
    id: 'andina-alimentos',
    nome: 'Andina Alimentos (Bolívia)',
    regiao: 'exportacao',
    canal: 'industrial',
    rating: 'B',
    volumeMensalT: 1500,
    prazoDias: 60,
    relacionamentoAnos: 1,
  },
]

export function getClienteExterno(id: string): ClienteExterno | undefined {
  return CLIENTES_EXTERNOS.find((c) => c.id === id)
}

interface EntradaOportunidade {
  id: string
  clienteId: string
  farinhaId: FarinhaId
  moinhoId: MoinhoId
  apresentacao: ApresentacaoFarinha
  volumeT: number
  precoLiquidoRsT: number
  /** Custo de servir da conta (R$/t): frete, comissão, embalagem e risco de crédito. */
  custoServirRsT: number
  /** Observação que explica o status quando ele não decorre só da margem. */
  ressalva?: string
}

/**
 * A primeira oportunidade é a do cenário-âncora: farinha de massas de Fortaleza
 * a R$ 2.500/t líquidos com custo de servir de R$ 120/t ⇒ margem de R$ 280/t.
 */
const ENTRADAS: EntradaOportunidade[] = [
  {
    id: 'op-massas-cearenses',
    clienteId: 'massas-cearenses',
    farinhaId: 'massa',
    moinhoId: 'fortaleza',
    apresentacao: 'granel',
    volumeT: 1600,
    precoLiquidoRsT: 2500,
    custoServirRsT: 120,
  },
  {
    id: 'op-varejo-norte',
    clienteId: 'varejo-norte',
    farinhaId: 'massa',
    moinhoId: 'salvador',
    apresentacao: 'saco-25kg',
    volumeT: 1100,
    precoLiquidoRsT: 2740,
    custoServirRsT: 330,
    ressalva: 'Frete fluvial e prazo de 45 dias respondem por R$ 330/t de custo de servir.',
  },
  {
    id: 'op-panificadora-nordeste',
    clienteId: 'panificadora-nordeste',
    farinhaId: 'pao',
    moinhoId: 'natal',
    apresentacao: 'saco-25kg',
    volumeT: 900,
    precoLiquidoRsT: 2620,
    custoServirRsT: 185,
  },
  {
    id: 'op-distribuidora-sertao',
    clienteId: 'distribuidora-sertao',
    farinhaId: 'domestica',
    moinhoId: 'cabedelo',
    apresentacao: 'saco-25kg',
    volumeT: 1400,
    precoLiquidoRsT: 2515,
    custoServirRsT: 165,
  },
  {
    id: 'op-rede-pao-bahia',
    clienteId: 'rede-pao-bahia',
    farinhaId: 'pao',
    moinhoId: 'salvador',
    apresentacao: 'saco-25kg',
    volumeT: 650,
    precoLiquidoRsT: 2560,
    custoServirRsT: 235,
    ressalva:
      'Rating C e prazo de 42 dias: o risco de crédito já está nos R$ 235/t de custo de servir, mas a política exige garantia antes de contratar.',
  },
  {
    id: 'op-biscoitos-paulista',
    clienteId: 'biscoitos-paulista',
    farinhaId: 'biscoito',
    moinhoId: 'cabedelo',
    apresentacao: 'granel',
    volumeT: 1300,
    precoLiquidoRsT: 2610,
    custoServirRsT: 245,
    ressalva: 'Frete Nordeste → Sudeste responde por quase todo o custo de servir.',
  },
  {
    id: 'op-panificio-cerrado',
    clienteId: 'panificio-cerrado',
    farinhaId: 'pao',
    moinhoId: 'salvador',
    apresentacao: 'saco-25kg',
    volumeT: 700,
    precoLiquidoRsT: 2690,
    custoServirRsT: 300,
  },
  {
    id: 'op-andina-exportacao',
    clienteId: 'andina-alimentos',
    farinhaId: 'massa',
    moinhoId: 'rolandia',
    apresentacao: 'big-bag',
    volumeT: 1500,
    precoLiquidoRsT: 2620,
    custoServirRsT: 265,
    ressalva:
      'Exportação: preço em dólar já convertido, prazo de 60 dias e despacho aduaneiro dentro do custo de servir.',
  },
  {
    id: 'op-alimentos-sul',
    clienteId: 'alimentos-sul',
    farinhaId: 'massa',
    moinhoId: 'bento-goncalves',
    apresentacao: 'granel',
    volumeT: 1500,
    precoLiquidoRsT: 2240,
    custoServirRsT: 105,
    ressalva:
      'No Sul o mercado de farinha é servido por moinhos próximos à origem do trigo: nosso custo interno em Bento Gonçalves não alcança o preço praticado.',
  },
]

/** Margem fina (R$/t) abaixo da qual a conta entra em "avaliar" e não em "recomendar". */
const MARGEM_MINIMA_RS_T = 200

/**
 * Guardrail de ruptura: separa o pedido na parcela que cabe na folga do moinho
 * e na que só é atendida tirando farinha das fábricas.
 *
 * A parcela segura rende contra o CUSTO MARGINAL (fixos já absorvidos). A
 * parcela em ruptura rende contra o CUSTO DE REPOSIÇÃO — o preço de comprar
 * de terceiros a farinha que deixou de ir para o consumo próprio. Medir as
 * duas com a mesma régua é o erro que faz uma venda destruidora parecer boa.
 */
function calcularGuardrail(
  e: EntradaOportunidade,
  folgaDisponivelT: number,
): GuardrailRuptura {
  const custo = custoInternoFarinha(e.moinhoId, e.farinhaId)
  const externo = precoExternoComparavel(e.farinhaId, regiaoDoMoinho(e.moinhoId))
  // Sem cotação comparável, repor sai pelo próprio custo pleno — é o melhor
  // proxy disponível e a tela avisa que a comparação exige ajuste.
  const custoReposicaoRsT = externo?.precoRsT ?? custo.totalRsT

  const volumeSeguroT = Math.max(0, Math.min(e.volumeT, folgaDisponivelT))
  const volumeEmRupturaT = Math.max(0, e.volumeT - volumeSeguroT)

  const margemSeguraRsT = arred1(e.precoLiquidoRsT - e.custoServirRsT - custo.custoMarginalRsT)
  const margemComReposicaoRsT = arred1(e.precoLiquidoRsT - e.custoServirRsT - custoReposicaoRsT)
  const margemPonderadaRsT =
    e.volumeT > 0
      ? arred1((margemSeguraRsT * volumeSeguroT + margemComReposicaoRsT * volumeEmRupturaT) / e.volumeT)
      : 0

  const semaforo: SemaforoRuptura =
    volumeEmRupturaT === 0
      ? 'seguro'
      : margemComReposicaoRsT > 0
        ? 'atencao'
        : 'ruptura'

  const ton = (v: number) => `${Math.round(v).toLocaleString('pt-BR')} t`
  const brl = (v: number) => `R$ ${v.toFixed(1).replace('.', ',')}`
  const diagnostico =
    volumeEmRupturaT === 0
      ? `As ${ton(e.volumeT)} cabem na folga de ${ton(folgaDisponivelT)}: nenhuma tonelada sai do consumo próprio.`
      : margemComReposicaoRsT > 0
        ? `${ton(volumeSeguroT)} cabem na folga; ${ton(volumeEmRupturaT)} só saem do consumo interno e obrigam a repor a ${brl(custoReposicaoRsT)}/t. Essa parcela ainda rende ${brl(margemComReposicaoRsT)}/t, mas troca farinha própria por farinha de terceiros nas fábricas.`
        : `${ton(volumeEmRupturaT)} do pedido forçariam compra emergencial a ${brl(custoReposicaoRsT)}/t, com margem de ${brl(margemComReposicaoRsT)}/t — vender essa parcela destrói valor. Reduzir o volume para ${ton(volumeSeguroT)} ou renegociar preço.`

  return {
    volumeSeguroT,
    volumeEmRupturaT,
    custoReposicaoRsT,
    margemSeguraRsT,
    margemComReposicaoRsT,
    margemPonderadaRsT,
    semaforo,
    diagnostico,
  }
}

function montarOportunidade(e: EntradaOportunidade, folgaDisponivelT: number): OportunidadeComercial {
  const cliente = getClienteExterno(e.clienteId)!
  const m = margemVendaExterna(e.farinhaId, {
    id: e.clienteId,
    moinhoId: e.moinhoId,
    precoLiquidoRsT: e.precoLiquidoRsT,
    volumeT: e.volumeT,
    custoServirRsT: e.custoServirRsT,
  })
  const capacidadeDisponivelT = capacidadeOciosaFarinhaT(e.moinhoId, e.farinhaId)
  const guardrail = calcularGuardrail(e, folgaDisponivelT)

  // Barra que a venda precisa superar: o ganho de usar a MESMA tonelada
  // internamente (verticalização). Vender por menos que isso é trocar margem
  // garantida por margem de terceiro.
  const ganhoVert = ganhoVerticalizacao(e.moinhoId, e.farinhaId, {
    regiao: regiaoDoMoinho(e.moinhoId),
    volumeT: e.volumeT,
  })
  const ganhoUsoInternoRsT = ganhoVert.comparavel ? ganhoVert.ganhoRsT : null

  const cabeNaCapacidade = guardrail.volumeEmRupturaT === 0
  const status: StatusOportunidade =
    m.margemRsT <= 0 || !cabeNaCapacidade
      ? 'recusar'
      : m.margemRsT < MARGEM_MINIMA_RS_T || cliente.rating === 'C'
        ? 'avaliar'
        : 'recomendada'

  const motivo =
    m.margemRsT <= 0
      ? `Margem negativa de R$ ${m.margemRsT.toFixed(1).replace('.', ',')}/t: o preço líquido não cobre custo interno + custo de servir (mínimo de R$ ${m.precoMinimoRsT.toFixed(1).replace('.', ',')}/t).`
      : !cabeNaCapacidade
        ? `Volume de ${e.volumeT.toLocaleString('pt-BR')} t excede a capacidade ociosa de ${capacidadeDisponivelT.toLocaleString('pt-BR')} t — atender exigiria deslocar produção das fábricas próprias.`
        : cliente.rating === 'C'
          ? `Margem de R$ ${m.margemRsT.toFixed(1).replace('.', ',')}/t é positiva, mas o rating ${cliente.rating} e o prazo de ${cliente.prazoDias} dias pedem garantia antes de contratar.`
          : m.margemRsT < MARGEM_MINIMA_RS_T
            ? `Margem de R$ ${m.margemRsT.toFixed(1).replace('.', ',')}/t abaixo do piso de R$ ${MARGEM_MINIMA_RS_T}/t — renegociar preço ou custo de servir.`
            : `Margem de R$ ${m.margemRsT.toFixed(1).replace('.', ',')}/t (${m.margemPct.toFixed(1).replace('.', ',')}%) dentro da capacidade ociosa de ${capacidadeDisponivelT.toLocaleString('pt-BR')} t.`

  return {
    id: e.id,
    clienteId: e.clienteId,
    farinhaId: e.farinhaId,
    moinhoId: e.moinhoId,
    regiao: cliente.regiao,
    canal: cliente.canal,
    apresentacao: e.apresentacao,
    volumeT: e.volumeT,
    precoLiquidoRsT: e.precoLiquidoRsT,
    custoServirRsT: e.custoServirRsT,
    custoInternoRsT: m.custoInternoRsT,
    margemRsT: m.margemRsT,
    margemTotalRs: m.margemTotalRs,
    precoMinimoRsT: m.precoMinimoRsT,
    capacidadeDisponivelT,
    ganhoUsoInternoRsT,
    superaUsoInterno: ganhoUsoInternoRsT != null ? m.margemRsT > ganhoUsoInternoRsT : null,
    guardrail,
    status,
    racional: e.ressalva ? `${motivo} ${e.ressalva}` : motivo,
  }
}

/**
 * Monta o portfólio conferindo a capacidade de forma CUMULATIVA por moinho:
 * duas contas do mesmo moinho podem caber sozinhas e estourar somadas. A
 * ordem é a de prioridade comercial (a lista acima), então a conta que não
 * couber no resíduo é rebaixada — e o motivo diz contra quem ela perdeu.
 */
function montarPortfolio(entradas: EntradaOportunidade[]): OportunidadeComercial[] {
  const usadoPorMoinho = new Map<MoinhoId, number>()
  return entradas.map((e) => {
    const jaUsado = usadoPorMoinho.get(e.moinhoId) ?? 0
    const folgaTotalT = capacidadeOciosaFarinhaT(e.moinhoId, e.farinhaId)
    const op = montarOportunidade(e, Math.max(0, folgaTotalT - jaUsado))
    const residuoT = op.capacidadeDisponivelT - jaUsado
    if (op.status !== 'recusar' && op.volumeT > residuoT) {
      return {
        ...op,
        status: 'recusar' as StatusOportunidade,
        racional:
          `Capacidade esgotada em ${op.moinhoId}: restam ${Math.max(0, residuoT).toLocaleString('pt-BR')} t das ` +
          `${op.capacidadeDisponivelT.toLocaleString('pt-BR')} t ociosas depois das contas de maior prioridade, e esta pede ${op.volumeT.toLocaleString('pt-BR')} t. ` +
          `A margem de R$ ${op.margemRsT.toFixed(1).replace('.', ',')}/t só se realiza liberando capacidade ou reduzindo o volume.`,
      }
    }
    if (op.status !== 'recusar') usadoPorMoinho.set(e.moinhoId, jaUsado + op.volumeT)
    return op
  })
}

export const OPORTUNIDADES_COMERCIAIS: OportunidadeComercial[] = montarPortfolio(ENTRADAS)

/** Margem mensal das oportunidades recomendadas (R$). */
export const MARGEM_OPORTUNIDADES_RECOMENDADAS_RS = OPORTUNIDADES_COMERCIAIS.filter(
  (o) => o.status === 'recomendada',
).reduce((soma, o) => soma + o.margemTotalRs, 0)

/** Volume mensal das oportunidades recomendadas (t de farinha). */
export const VOLUME_OPORTUNIDADES_RECOMENDADAS_T = OPORTUNIDADES_COMERCIAIS.filter(
  (o) => o.status === 'recomendada',
).reduce((soma, o) => soma + o.volumeT, 0)

export const CANAIS_FARINHA: Array<{ id: CanalFarinha; rotulo: string }> = [
  { id: 'industrial', rotulo: 'Industrial' },
  { id: 'panificacao', rotulo: 'Panificação' },
  { id: 'distribuidor', rotulo: 'Distribuidor' },
  { id: 'varejo', rotulo: 'Varejo' },
]

export const REGIOES_COMERCIAIS: Array<{ id: RegiaoComercial; rotulo: string }> = [
  { id: 'nordeste', rotulo: 'Nordeste' },
  { id: 'norte', rotulo: 'Norte' },
  { id: 'sudeste', rotulo: 'Sudeste' },
  { id: 'sul', rotulo: 'Sul' },
  { id: 'centro-oeste', rotulo: 'Centro-Oeste' },
  { id: 'exportacao', rotulo: 'Exportação' },
]

/** Agregado por região para o mapa: contagem, volume e margem. */
export function resumoPorRegiao() {
  return REGIOES_COMERCIAIS.map((r) => {
    const daRegiao = OPORTUNIDADES_COMERCIAIS.filter((o) => o.regiao === r.id)
    const vendaveis = daRegiao.filter((o) => o.status !== 'recusar')
    return {
      regiao: r.id,
      rotulo: r.rotulo,
      oportunidades: daRegiao.length,
      volumeT: vendaveis.reduce((soma, o) => soma + o.volumeT, 0),
      margemRs: vendaveis.reduce((soma, o) => soma + o.margemTotalRs, 0),
      melhorMargemRsT: daRegiao.length
        ? Math.max(...daRegiao.map((o) => o.margemRsT))
        : 0,
      temRuptura: daRegiao.some((o) => o.guardrail.volumeEmRupturaT > 0),
    }
  })
}
