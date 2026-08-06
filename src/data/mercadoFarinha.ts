/**
 * Mercado de FARINHA — o outro lado do preço do trigo.
 *
 * REGRA QUE GOVERNA ESTE ARQUIVO (CLAUDE.md § Comparação apples-to-apples):
 * uma série de preço de farinha só é lida como tendência quando todos os 8
 * eixos estão fixos. Aqui as séries são todas de canal INDUSTRIAL, apresentação
 * GRANEL e base POSTO FÁBRICA — a mesma base em que o custo interno é apurado.
 * Uma curva que misturasse saco de 25 kg com granel mostraria "alta de preço"
 * que é só mudança de mix de embalagem, e o Make/Buy/Sell decidiria pelo eixo
 * errado.
 *
 * As cotações NÃO comparáveis continuam existindo (varejo, panificação, Norte)
 * e aparecem na tela — mas com a ressalva e o ajuste explícito, nunca dentro de
 * uma tendência.
 */
import type {
  ConcorrenteFarinha,
  FarinhaId,
  OportunidadeRegionalFarinha,
  RegiaoComercial,
  SerieFarinhaMercado,
  TendenciaFarinha,
} from './types'
import { PRECOS_FARINHA_EXTERNOS, getFarinha, precoExternoComparavel } from './farinha'
import { MOINHOS, regiaoDoMoinho } from './dominio'
import { custoInternoFarinha } from './economics'

/**
 * Séries comparáveis. `precoAtualRsT` NUNCA é digitado: sai de
 * `precoExternoComparavel`, o mesmo caminho que o Make/Buy/Sell usa. Assim, se
 * uma cotação mudar em farinha.ts, a curva do mercado muda junto — não há como
 * a tela de Mercado dizer um preço e a decisão usar outro.
 */
interface EntradaSerie {
  farinhaId: FarinhaId
  regiao: RegiaoComercial
  /** Variações mensais (%) dos últimos 5 meses até hoje, do mais antigo ao atual. */
  variacoesPct: number[]
  /** Variação projetada para 30 dias (%). */
  projecaoPct: number
  driver: string
}

const ENTRADAS: EntradaSerie[] = [
  {
    farinhaId: 'massa',
    regiao: 'nordeste',
    variacoesPct: [-0.6, 0.4, 1.1, 1.4, 1.8],
    projecaoPct: 2.1,
    driver: 'Trigo importado em alta e safra argentina revisada: os moageiros independentes repassam com 30–45 dias de defasagem.',
  },
  {
    farinhaId: 'pao',
    regiao: 'nordeste',
    variacoesPct: [-0.3, 0.5, 1.0, 1.5, 1.9],
    projecaoPct: 2.3,
    driver: 'Mesma pressão de trigo, amplificada pela escassez de proteína alta (HRW) na janela.',
  },
  {
    farinhaId: 'biscoito',
    regiao: 'nordeste',
    variacoesPct: [0.2, 0.3, 0.5, 0.4, 0.6],
    projecaoPct: 0.8,
    driver: 'Farinha soft depende de trigo brasileiro e argentino soft — menos exposta ao câmbio que as farinhas hard.',
  },
  {
    farinhaId: 'cracker',
    regiao: 'nordeste',
    variacoesPct: [0.1, 0.4, 0.7, 0.6, 0.9],
    projecaoPct: 1.2,
    driver: 'Demanda industrial firme no canal de biscoito laminado, com oferta regional concentrada.',
  },
  {
    farinhaId: 'bolo',
    regiao: 'nordeste',
    variacoesPct: [0.4, 0.6, 0.9, 1.1, 1.3],
    projecaoPct: 1.6,
    driver: 'Baixa cinza exige moagem mais refinada: poucos moageiros entregam a spec e o prêmio se sustenta.',
  },
  {
    farinhaId: 'massa',
    regiao: 'sul',
    variacoesPct: [0.3, -0.4, -0.8, -1.1, -1.3],
    projecaoPct: -1.5,
    driver: 'Colheita do RS/PR chegando: perto da origem, o trigo doméstico derruba o preço da farinha.',
  },
  {
    farinhaId: 'pao',
    regiao: 'sul',
    variacoesPct: [0.2, -0.3, -0.7, -0.9, -1.2],
    projecaoPct: -1.4,
    driver: 'Mesma colheita, com oferta de proteína média suficiente para o canal industrial.',
  },
  {
    farinhaId: 'massa',
    regiao: 'sudeste',
    variacoesPct: [-0.2, 0.3, 0.6, 0.7, 0.9],
    projecaoPct: 1.0,
    driver: 'Mercado equilibrado: recebe farinha do Sul e do Nordeste, o que amortece os dois extremos.',
  },
  {
    farinhaId: 'biscoito',
    regiao: 'sudeste',
    variacoesPct: [0.1, 0.2, 0.4, 0.5, 0.5],
    projecaoPct: 0.7,
    driver: 'Concorrência de moageiros de SP/MG mantém o prêmio de soft comprimido.',
  },
  {
    farinhaId: 'massa',
    regiao: 'centro-oeste',
    variacoesPct: [0.0, 0.4, 0.8, 1.0, 1.2],
    projecaoPct: 1.4,
    driver: 'Frete rodoviário longo domina o preço; qualquer alta de diesel aparece na farinha em 2 semanas.',
  },
]

/** Classifica a tendência pela projeção de 30 dias (±0,5% é ruído, não sinal). */
function classificar(projecaoPct: number): TendenciaFarinha {
  if (projecaoPct > 0.5) return 'subindo'
  if (projecaoPct < -0.5) return 'caindo'
  return 'estavel'
}

const arred = (v: number) => Math.round(v)

/**
 * Reconstrói o histórico PARA TRÁS a partir do preço de hoje. Fazer o caminho
 * inverso (histórico digitado → preço de hoje) deixaria a ponta da curva
 * divergir da cotação que a decisão usa; assim, o último ponto é, por
 * construção, exatamente o preço comparável de `farinha.ts`.
 */
function montarSerie(e: EntradaSerie): SerieFarinhaMercado | null {
  const cotacao = precoExternoComparavel(e.farinhaId, e.regiao)
  if (!cotacao) return null

  const historico: number[] = [cotacao.precoRsT]
  for (let i = e.variacoesPct.length - 1; i >= 0; i--) {
    const anterior = historico[0] / (1 + e.variacoesPct[i] / 100)
    historico.unshift(anterior)
  }

  return {
    id: `serie-${e.farinhaId}-${e.regiao}`,
    farinhaId: e.farinhaId,
    regiao: e.regiao,
    precoAtualRsT: cotacao.precoRsT,
    historicoRsT: historico.map(arred),
    projecaoD30RsT: arred(cotacao.precoRsT * (1 + e.projecaoPct / 100)),
    tendencia: classificar(e.projecaoPct),
    driver: e.driver,
  }
}

export const SERIES_FARINHA_MERCADO: SerieFarinhaMercado[] = ENTRADAS.map(montarSerie).filter(
  (s): s is SerieFarinhaMercado => s !== null,
)

/** Meses rotulados do histórico das séries (6 pontos, mar→ago de 2025). */
export const MESES_SERIE_FARINHA = ['mar', 'abr', 'mai', 'jun', 'jul', 'ago'] as const

/**
 * Tendência consolidada da farinha, ponderada pelo VOLUME que cada spec
 * representa nas nossas fábricas — não pela média simples das séries. Uma
 * média simples daria ao bolo (spec pequena) o mesmo peso de massas, e a leitura
 * executiva ficaria refém de um nicho.
 */
const PESO_SPEC: Record<string, number> = { massa: 3, biscoito: 3, pao: 1, cracker: 1, bolo: 0.5 }

const variacaoMediaPct =
  SERIES_FARINHA_MERCADO.reduce((soma, s) => {
    const peso = PESO_SPEC[s.farinhaId] ?? 1
    return soma + ((s.projecaoD30RsT / s.precoAtualRsT - 1) * 100 * peso)
  }, 0) /
  SERIES_FARINHA_MERCADO.reduce((soma, s) => soma + (PESO_SPEC[s.farinhaId] ?? 1), 0)

export const TENDENCIA_FARINHA_CONSOLIDADA = {
  variacaoD30Pct: Math.round(variacaoMediaPct * 100) / 100,
  tendencia: classificar(variacaoMediaPct),
  /** Quantas séries sobem, ficam estáveis e caem. */
  contagem: {
    subindo: SERIES_FARINHA_MERCADO.filter((s) => s.tendencia === 'subindo').length,
    estavel: SERIES_FARINHA_MERCADO.filter((s) => s.tendencia === 'estavel').length,
    caindo: SERIES_FARINHA_MERCADO.filter((s) => s.tendencia === 'caindo').length,
  },
  leitura:
    'Nordeste sobe com o trigo importado; Sul cai com a colheita do RS/PR. É esse descolamento — e não uma "média de mercado" — que abre a decisão de comprar farinha no Sul e vender no Nordeste.',
} as const

/**
 * Concorrentes: quem faz o preço que enfrentamos. `posicaoPrecoRsT` é a
 * diferença vs a NOSSA cotação comparável — negativo significa que o
 * concorrente entrega a mesma spec mais barato, e é aí que a decisão de comprar
 * em vez de moer começa a fazer sentido.
 */
export const CONCORRENTES_FARINHA: ConcorrenteFarinha[] = [
  {
    id: 'conc-moinho-cearense',
    nome: 'Moinho Cearense',
    regioes: ['nordeste'],
    capacidadeMensalT: 28_000,
    farinhas: ['massa', 'pao', 'biscoito'],
    posicaoPrecoRsT: 0,
    perfil: 'Moageiro regional de porto (Pecém). Concorre em preço no canal industrial e é a referência da nossa cotação comparável no Nordeste.',
  },
  {
    id: 'conc-grande-moinho-nordeste',
    nome: 'Grande Moinho do Nordeste',
    regioes: ['nordeste', 'norte'],
    capacidadeMensalT: 46_000,
    farinhas: ['massa', 'pao', 'domestica'],
    posicaoPrecoRsT: 35,
    perfil: 'Escala e marca própria no varejo. Preço acima no industrial porque prioriza o canal doméstico, de margem maior.',
  },
  {
    id: 'conc-moageira-sul',
    nome: 'Moageira do Sul',
    regioes: ['sul', 'sudeste'],
    capacidadeMensalT: 52_000,
    farinhas: ['massa', 'pao'],
    posicaoPrecoRsT: -170,
    perfil: 'Junto à origem do trigo no RS/PR. É a cotação que torna COMPRAR farinha mais barato que moer em Bento Gonçalves.',
  },
  {
    id: 'conc-paulista',
    nome: 'Moinho Paulista',
    regioes: ['sudeste', 'centro-oeste'],
    capacidadeMensalT: 38_000,
    farinhas: ['massa', 'biscoito'],
    posicaoPrecoRsT: -55,
    perfil: 'Bem posicionado no eixo SP–MG. Ataca contratos industriais com prazo de 30 dias.',
  },
  {
    id: 'conc-especialista-bolo',
    nome: 'Farinhas Especiais (baixa cinza)',
    regioes: ['nordeste', 'sudeste'],
    capacidadeMensalT: 9_000,
    farinhas: ['bolo'],
    posicaoPrecoRsT: 90,
    perfil: 'Nicho de farinha de bolo com cinzas ≤ 0,45%. Preço alto porque poucos entregam a spec — é onde nosso custo interno tem a maior folga.',
  },
]

/**
 * Oportunidades regionais: onde o preço comparável supera o custo interno do
 * moinho que atenderia, já líquido do custo de servir. O custo de servir é
 * ESTIMADO por distância entre a região do moinho e a região de destino — sem
 * ele, todo mercado distante pareceria melhor que o de casa, que é exatamente
 * o erro que a tela de Oportunidades existe para evitar.
 */
const CUSTO_SERVIR_POR_DISTANCIA: Record<string, number> = {
  mesma: 120,
  vizinha: 185,
  distante: 265,
}

const VIZINHAS: Partial<Record<RegiaoComercial, RegiaoComercial[]>> = {
  nordeste: ['norte', 'sudeste'],
  norte: ['nordeste'],
  sudeste: ['sul', 'centro-oeste', 'nordeste'],
  sul: ['sudeste'],
  'centro-oeste': ['sudeste'],
}

function custoServirEstimado(origem: RegiaoComercial, destino: RegiaoComercial): number {
  if (origem === destino) return CUSTO_SERVIR_POR_DISTANCIA.mesma
  if (VIZINHAS[origem]?.includes(destino)) return CUSTO_SERVIR_POR_DISTANCIA.vizinha
  return CUSTO_SERVIR_POR_DISTANCIA.distante
}

/**
 * O perfil produtivo do moinho tem 4 linhas (biscoito, cracker, massa, pão),
 * mas o portfólio tem 6 farinhas. Bolo e doméstica rodam na linha SOFT — a
 * mesma de biscoito —, e é assim que o parque opera: a diferença está na
 * extração e no ajuste de cinzas, não numa linha dedicada.
 */
const LINHA_DO_MOINHO: Record<string, 'biscoito' | 'cracker' | 'massa' | 'pao'> = {
  massa: 'massa',
  pao: 'pao',
  biscoito: 'biscoito',
  bolo: 'biscoito',
  domestica: 'massa',
  pizza: 'pao',
  industrial: 'massa',
}

/**
 * Para cada série, escolhe o moinho de MENOR custo interno que roda a spec e
 * calcula a margem de atender aquela região. Escolher pelo custo interno (e não
 * pela proximidade) é o ponto: às vezes vale rodar longe e pagar frete.
 */
export function oportunidadesRegionais(): OportunidadeRegionalFarinha[] {
  return SERIES_FARINHA_MERCADO.map((serie) => {
    const spec = getFarinha(serie.farinhaId)
    const linha = spec ? LINHA_DO_MOINHO[spec.aplicacao] : null
    const candidatos = MOINHOS.filter((m) => linha != null && m.perfilProduto.includes(linha))
    const avaliados = (candidatos.length > 0 ? candidatos : MOINHOS).map((m) => {
      const custo = custoInternoFarinha(m.id, serie.farinhaId).totalRsT
      const servir = custoServirEstimado(regiaoDoMoinho(m.id), serie.regiao)
      return { moinhoId: m.id, custo, margem: serie.precoAtualRsT - custo - servir }
    })
    const melhor = avaliados.sort((a, b) => b.margem - a.margem)[0]
    return {
      regiao: serie.regiao,
      farinhaId: serie.farinhaId,
      precoRsT: serie.precoAtualRsT,
      custoInternoRsT: Math.round(melhor.custo * 10) / 10,
      moinhoId: melhor.moinhoId,
      margemRsT: Math.round(melhor.margem * 10) / 10,
      tendencia: serie.tendencia,
    }
  }).sort((a, b) => b.margemRsT - a.margemRsT)
}

/** Cotações que NÃO servem para comparar — exibidas com a ressalva obrigatória. */
export const COTACOES_NAO_COMPARAVEIS = PRECOS_FARINHA_EXTERNOS.filter((p) => !p.comparavel)

/**
 * A ressalva que impede a leitura errada do quadro regional. A cotação
 * comparável é a MESMA que usamos como preço de compra equivalente — vender a
 * ela é vender no lado errado do spread. Por isso a margem regional é um piso,
 * e não contradiz a âncora de R$ 280/t da venda contratada.
 */
export const NOTA_MARGEM_REFERENCIA =
  'A margem aqui é a do PISO: preço de mercado genérico menos custo interno e custo de servir. É a mesma cotação que serve de preço de compra equivalente (R$ 2.350/t em massas no Nordeste), então ela mede o piso da região — não o resultado de um contrato. Os contratos com cliente, volume e prazo definidos vivem em Oportunidades Comerciais e ficam acima deste piso (R$ 2.500/t líquidos ⇒ R$ 280/t no cenário-âncora).'
