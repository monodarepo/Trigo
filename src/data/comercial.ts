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
  MoinhoId,
  OportunidadeComercial,
  RegiaoComercial,
  StatusOportunidade,
} from './types'
import { capacidadeOciosaFarinhaT, margemVendaExterna } from './economics'

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

function montarOportunidade(e: EntradaOportunidade): OportunidadeComercial {
  const cliente = getClienteExterno(e.clienteId)!
  const m = margemVendaExterna(e.farinhaId, {
    id: e.clienteId,
    moinhoId: e.moinhoId,
    precoLiquidoRsT: e.precoLiquidoRsT,
    volumeT: e.volumeT,
    custoServirRsT: e.custoServirRsT,
  })
  const capacidadeDisponivelT = capacidadeOciosaFarinhaT(e.moinhoId, e.farinhaId)

  const cabeNaCapacidade = e.volumeT <= capacidadeDisponivelT
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
    const op = montarOportunidade(e)
    const jaUsado = usadoPorMoinho.get(e.moinhoId) ?? 0
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
]
