/**
 * ESTOQUES & BLENDS — os lotes de trigo em silo e o otimizador de blend.
 *
 * O otimizador responde à pergunta do moinho: dada uma farinha-alvo, qual a
 * combinação de lotes de MENOR CUSTO que atende a especificação inteira?
 * Não é heurística nem resposta gravada — é busca exaustiva sobre o espaço
 * discretizado (ver `otimizarBlend`), então mudar um lote muda a resposta.
 *
 * COERÊNCIA COM O CENÁRIO: para a farinha de massas, o ótimo cai em 65%
 * Argentina + 35% EUA-HRW — o mesmo blend da Recomendação de Compra. Não está
 * escrito em lugar nenhum: 65/35 é a menor fração do HRW caro que ainda leva a
 * proteína ao mínimo da spec, e o otimizador encontra isso sozinho.
 */
import type { FarinhaId, OrigemId } from './types'
import { getOrigem } from './dominio'

export type StatusLote = 'disponivel' | 'reservado' | 'bloqueado'

/** Qualidade do TRIGO em silo (base do blend). */
export interface QualidadeLote {
  /** Proteína em % (base 13,5% de umidade). */
  proteina: number
  /** Força de glúten — W do alveógrafo. */
  w: number
  /** Falling number em segundos. */
  fallingNumber: number
  /** Umidade em %. */
  umidade: number
  /** Cinzas em % (base seca). */
  cinzas: number
  /** Deoxinivalenol em ppb. */
  don: number
  /** Peso hectolítrico em kg/hl. */
  pesoHectolitrico: number
}

export interface LoteTrigo {
  id: string
  origemId: OrigemId
  /** Silo/armazém onde o lote está (moinho ou terminal portuário). */
  silo: string
  /** Quantidade em estoque (t). */
  quantidadeT: number
  /** Data de entrada no silo (ISO). */
  entradaEm: string
  /** Custo do lote posto no silo (R$/t) — o TLC com que ele foi comprado. */
  custoRsT: number
  qualidade: QualidadeLote
  status: StatusLote
  /** Contrato/embarque de origem, quando rastreável. */
  contratoId?: string
}

/** Instante do cenário-âncora — a idade dos lotes é medida a partir dele. */
const HOJE = '2025-08-12'
const diasDesde = (iso: string) =>
  Math.round((+new Date(HOJE) - +new Date(iso)) / 86_400_000)

/** Acima disso o lote entra em atenção: trigo velho perde falling number. */
export const IDADE_ATENCAO_DIAS = 90
export const IDADE_CRITICA_DIAS = 150

/**
 * Os lotes em silo. Os custos vêm dos TLCs praticados por origem no cenário
 * (Argentina R$ 1.480/t é o do lote recomendado; HRW carrega o imposto
 * extra-Mercosul e o frete mais longo).
 */
export const LOTES_TRIGO: LoteTrigo[] = [
  {
    id: 'LT-2508-ARG-01',
    origemId: 'argentina',
    silo: 'Terminal Pecém · silo 3',
    quantidadeT: 18_400,
    entradaEm: '2025-07-28',
    custoRsT: 1480,
    contratoId: 'ct-2025-041',
    qualidade: {
      proteina: 11.8,
      w: 265,
      fallingNumber: 318,
      umidade: 12.8,
      cinzas: 1.52,
      don: 420,
      pesoHectolitrico: 79.2,
    },
    status: 'disponivel',
  },
  {
    id: 'LT-2506-ARG-02',
    origemId: 'argentina',
    silo: 'Moinho Fortaleza · silo A',
    quantidadeT: 6_200,
    entradaEm: '2025-04-19',
    custoRsT: 1452,
    qualidade: {
      proteina: 11.4,
      w: 248,
      fallingNumber: 268,
      umidade: 13.1,
      cinzas: 1.58,
      don: 510,
      pesoHectolitrico: 78.1,
    },
    status: 'disponivel',
  },
  {
    id: 'LT-2507-HRW-01',
    origemId: 'eua-golfo',
    silo: 'Terminal Pecém · silo 1',
    quantidadeT: 11_900,
    entradaEm: '2025-07-06',
    custoRsT: 1736,
    contratoId: 'ct-2025-038',
    qualidade: {
      proteina: 13.8,
      w: 330,
      fallingNumber: 342,
      umidade: 12.2,
      cinzas: 1.48,
      don: 180,
      pesoHectolitrico: 81.4,
    },
    status: 'disponivel',
  },
  {
    id: 'LT-2507-ARG-SOFT',
    origemId: 'argentina',
    silo: 'Terminal Pecém · silo 4',
    quantidadeT: 14_500,
    entradaEm: '2025-07-11',
    custoRsT: 1428,
    contratoId: 'ct-2025-036',
    qualidade: {
      proteina: 9.4,
      w: 118,
      fallingNumber: 305,
      umidade: 12.6,
      cinzas: 1.5,
      don: 340,
      pesoHectolitrico: 78.6,
    },
    status: 'disponivel',
  },
  {
    id: 'LT-2505-BRA-01',
    origemId: 'brasil',
    silo: 'Moinho Rolândia · silo B',
    quantidadeT: 9_300,
    entradaEm: '2025-05-22',
    custoRsT: 1395,
    qualidade: {
      proteina: 10.2,
      w: 190,
      fallingNumber: 288,
      umidade: 13.0,
      cinzas: 1.61,
      don: 640,
      pesoHectolitrico: 77.6,
    },
    status: 'disponivel',
  },
  {
    id: 'LT-2504-BRA-02',
    origemId: 'brasil',
    silo: 'Moinho Bento Gonçalves · silo A',
    quantidadeT: 4_100,
    entradaEm: '2025-03-02',
    custoRsT: 1372,
    qualidade: {
      proteina: 9.6,
      w: 148,
      fallingNumber: 232,
      umidade: 13.4,
      cinzas: 1.66,
      don: 720,
      pesoHectolitrico: 76.4,
    },
    status: 'disponivel',
  },
  {
    id: 'LT-2506-RUS-01',
    origemId: 'russia',
    silo: 'Terminal Suape · silo 2',
    quantidadeT: 7_600,
    entradaEm: '2025-06-11',
    custoRsT: 1455,
    qualidade: {
      proteina: 12.3,
      w: 255,
      fallingNumber: 301,
      umidade: 13.2,
      cinzas: 1.57,
      don: 1_800,
      pesoHectolitrico: 78.8,
    },
    status: 'bloqueado',
  },
  {
    id: 'LT-2507-CAN-01',
    origemId: 'canada',
    silo: 'Terminal Aratu · silo 1',
    quantidadeT: 5_400,
    entradaEm: '2025-07-15',
    custoRsT: 1890,
    qualidade: {
      proteina: 14.2,
      w: 345,
      fallingNumber: 355,
      umidade: 12.0,
      cinzas: 1.44,
      don: 120,
      pesoHectolitrico: 82.1,
    },
    status: 'disponivel',
  },
  {
    id: 'LT-2507-URU-01',
    origemId: 'uruguai',
    silo: 'Terminal Cabedelo · silo 2',
    quantidadeT: 3_800,
    entradaEm: '2025-07-02',
    custoRsT: 1462,
    qualidade: {
      proteina: 11.2,
      w: 250,
      fallingNumber: 295,
      umidade: 12.9,
      cinzas: 1.55,
      don: 380,
      pesoHectolitrico: 78.4,
    },
    status: 'reservado',
  },
]

export function idadeLoteDias(lote: LoteTrigo): number {
  return diasDesde(lote.entradaEm)
}

// ---------------------------------------------------------------------------
// Especificação-alvo por farinha
// ---------------------------------------------------------------------------

export interface FaixaParametro {
  min?: number
  max?: number
}

/**
 * Faixas do TRIGO (não da farinha) que cada spec exige. A proteína da farinha
 * sai ~0,8 pp abaixo da do trigo na extração de referência, então os limites
 * aqui são deslocados para cima em relação à spec de farinha do portfólio.
 */
export interface EspecificacaoBlend {
  farinhaId: FarinhaId
  proteina: FaixaParametro
  w: FaixaParametro
  fallingNumber: FaixaParametro
  umidade: FaixaParametro
  cinzas: FaixaParametro
  don: FaixaParametro
  pesoHectolitrico: FaixaParametro
}

export const ESPECIFICACOES_BLEND: Record<FarinhaId, EspecificacaoBlend> = {
  massa: {
    farinhaId: 'massa',
    proteina: { min: 12.5, max: 14 },
    w: { min: 260, max: 320 },
    fallingNumber: { min: 250, max: 380 },
    umidade: { max: 13.5 },
    cinzas: { max: 1.6 },
    don: { max: 1_000 },
    pesoHectolitrico: { min: 76 },
  },
  pao: {
    farinhaId: 'pao',
    proteina: { min: 13, max: 15 },
    w: { min: 290, max: 360 },
    fallingNumber: { min: 250, max: 380 },
    umidade: { max: 13.5 },
    cinzas: { max: 1.6 },
    don: { max: 1_000 },
    pesoHectolitrico: { min: 77 },
  },
  cracker: {
    farinhaId: 'cracker',
    proteina: { min: 10, max: 11.6 },
    w: { min: 130, max: 200 },
    fallingNumber: { min: 240, max: 380 },
    umidade: { max: 13.5 },
    cinzas: { max: 1.62 },
    don: { max: 750 },
    pesoHectolitrico: { min: 75 },
  },
  domestica: {
    farinhaId: 'domestica',
    proteina: { min: 10.8, max: 12.4 },
    w: { min: 175, max: 240 },
    fallingNumber: { min: 240, max: 380 },
    umidade: { max: 13.5 },
    cinzas: { max: 1.6 },
    don: { max: 1_000 },
    pesoHectolitrico: { min: 76 },
  },
  biscoito: {
    farinhaId: 'biscoito',
    proteina: { min: 9, max: 10.6 },
    w: { min: 90, max: 170 },
    fallingNumber: { min: 230, max: 380 },
    umidade: { max: 13.5 },
    cinzas: { max: 1.68 },
    don: { max: 750 },
    pesoHectolitrico: { min: 75 },
  },
  bolo: {
    farinhaId: 'bolo',
    proteina: { min: 8.5, max: 10 },
    w: { min: 80, max: 140 },
    fallingNumber: { min: 230, max: 380 },
    umidade: { max: 13.5 },
    cinzas: { max: 1.7 },
    don: { max: 750 },
    pesoHectolitrico: { min: 74 },
  },
}

export type ChaveParametro = keyof Omit<EspecificacaoBlend, 'farinhaId'>

export const PARAMETROS: Array<{
  chave: ChaveParametro
  rotulo: string
  unidade: string
  casas: number
}> = [
  { chave: 'proteina', rotulo: 'Proteína', unidade: '%', casas: 2 },
  { chave: 'w', rotulo: 'Força de glúten (W)', unidade: '', casas: 0 },
  { chave: 'fallingNumber', rotulo: 'Falling number', unidade: 's', casas: 0 },
  { chave: 'umidade', rotulo: 'Umidade', unidade: '%', casas: 2 },
  { chave: 'cinzas', rotulo: 'Cinzas', unidade: '%', casas: 3 },
  { chave: 'don', rotulo: 'DON', unidade: 'ppb', casas: 0 },
  { chave: 'pesoHectolitrico', rotulo: 'Peso hectolítrico', unidade: 'kg/hl', casas: 1 },
]

// ---------------------------------------------------------------------------
// Mistura de parâmetros
// ---------------------------------------------------------------------------

/**
 * Falling number NÃO é aditivo — a atividade amilásica é. A prática de moagem
 * mistura pelo LIQUEFACTION NUMBER (LN = 6000/(FN − 50)), que é linear na
 * massa, e converte de volta. Misturar FN direto superestimaria a resistência
 * do blend e deixaria passar trigo germinado.
 */
const paraLN = (fn: number) => 6000 / Math.max(1, fn - 50)
const deLN = (ln: number) => 6000 / Math.max(0.0001, ln) + 50

/** Parâmetros do blend a partir das frações (que devem somar 1). */
export function misturarQualidade(
  partes: ReadonlyArray<{ lote: LoteTrigo; fracao: number }>,
): QualidadeLote {
  const soma = (f: (q: QualidadeLote) => number) =>
    partes.reduce((acc, p) => acc + f(p.lote.qualidade) * p.fracao, 0)
  return {
    // Lineares na massa: é como a indústria calcula o blend.
    proteina: soma((q) => q.proteina),
    w: soma((q) => q.w),
    umidade: soma((q) => q.umidade),
    cinzas: soma((q) => q.cinzas),
    don: soma((q) => q.don),
    pesoHectolitrico: soma((q) => q.pesoHectolitrico),
    fallingNumber: deLN(soma((q) => paraLN(q.fallingNumber))),
  }
}

export interface AderenciaParametro {
  chave: ChaveParametro
  rotulo: string
  unidade: string
  casas: number
  valor: number
  faixa: FaixaParametro
  atende: boolean
  /** Distância até o limite mais próximo — a folga contra a spec. */
  folga: number
  /** Texto da folga ("+0,3 acima do mínimo", "no limite"). */
  folgaRotulo: string
}

export function avaliarAderencia(
  qualidade: QualidadeLote,
  spec: EspecificacaoBlend,
): AderenciaParametro[] {
  return PARAMETROS.map((p) => {
    const valor = qualidade[p.chave]
    const faixa = spec[p.chave]
    const atendeMin = faixa.min == null || valor >= faixa.min - 1e-9
    const atendeMax = faixa.max == null || valor <= faixa.max + 1e-9
    const folgaMin = faixa.min != null ? valor - faixa.min : Number.POSITIVE_INFINITY
    const folgaMax = faixa.max != null ? faixa.max - valor : Number.POSITIVE_INFINITY
    const folga = Math.min(folgaMin, folgaMax)
    const fmt = (v: number) => v.toFixed(p.casas).replace('.', ',')
    return {
      ...p,
      valor,
      faixa,
      atende: atendeMin && atendeMax,
      folga,
      folgaRotulo: !atendeMin
        ? `${fmt(Math.abs(folgaMin))} abaixo do mínimo`
        : !atendeMax
          ? `${fmt(Math.abs(folgaMax))} acima do máximo`
          : Number.isFinite(folga)
            ? folga < (faixa.max != null && faixa.min != null ? (faixa.max - faixa.min) * 0.06 : 0.06)
              ? 'no limite'
              : `${fmt(folga)} de folga`
            : 'sem limite',
    }
  })
}

// ---------------------------------------------------------------------------
// O otimizador
// ---------------------------------------------------------------------------

export interface ParteBlend {
  loteId: string
  origemId: OrigemId
  pct: number
  toneladas: number
  custoRsT: number
}

export interface ResultadoBlend {
  farinhaId: FarinhaId
  volumeT: number
  partes: ParteBlend[]
  /** Custo ponderado do blend (R$/t de trigo). */
  custoRsT: number
  qualidade: QualidadeLote
  aderencia: AderenciaParametro[]
  atendeSpec: boolean
  /** Lotes descartados e o porquê — a parte explicável do otimizador. */
  descartados: Array<{ loteId: string; motivo: string }>
  /** Quantas combinações foram avaliadas (honestidade sobre o método). */
  combinacoesAvaliadas: number
  racional: string
}

/** Passo da grade de proporções (%). 5% é o passo operacional do moinho. */
const PASSO_PCT = 5
/** Máximo de lotes num blend — mais que isso é inviável na balança do moinho. */
const MAX_LOTES = 3

const arred = (v: number, casas: number) => {
  const f = 10 ** casas
  return Math.round(v * f) / f
}

/** Combinações de frações (em passos de PASSO_PCT) que somam 100 para n lotes. */
function grades(n: number): number[][] {
  const passos = 100 / PASSO_PCT
  const saida: number[][] = []
  const rec = (restante: number, faltam: number, atual: number[]) => {
    if (faltam === 1) {
      if (restante > 0) saida.push([...atual, restante])
      return
    }
    for (let i = 1; i <= restante - (faltam - 1); i += 1) rec(restante - i, faltam - 1, [...atual, i])
  }
  rec(passos, n, [])
  return saida.map((c) => c.map((x) => x * PASSO_PCT))
}

const GRADES = [1, 2, 3].map((n) => grades(n))

/**
 * BLEND DE MENOR CUSTO que atende a especificação.
 *
 * Busca exaustiva sobre subconjuntos de até 3 lotes e proporções em passos de
 * 5% — o mesmo espaço em que o moinho realmente opera. Não é aproximação
 * gulosa: toda combinação viável é avaliada e a mais barata vence, então a
 * resposta é ótima DENTRO dessa grade (e o número de combinações avaliadas
 * aparece na tela, para o método não virar caixa-preta).
 *
 * Restrições: só lotes disponíveis, e cada parte precisa caber na quantidade
 * do lote — um blend que exige mais trigo do que existe no silo não é solução.
 */
export function otimizarBlend(farinhaId: FarinhaId, volumeT: number): ResultadoBlend {
  const spec = ESPECIFICACOES_BLEND[farinhaId]
  const descartados: Array<{ loteId: string; motivo: string }> = []

  const elegiveis = LOTES_TRIGO.filter((l) => {
    if (l.status === 'bloqueado') {
      descartados.push({ loteId: l.id, motivo: 'Lote bloqueado para uso' })
      return false
    }
    if (l.status === 'reservado') {
      descartados.push({ loteId: l.id, motivo: 'Lote reservado para outro programa' })
      return false
    }
    // Um lote que sozinho já estoura um limite MÁXIMO não é necessariamente
    // inútil (a mistura pode diluí-lo), então só descartamos aqui os que não
    // cabem em quantidade — o resto o próprio otimizador resolve.
    return true
  })

  let melhor: { partes: ParteBlend[]; custo: number; qualidade: QualidadeLote } | null = null
  let combinacoesAvaliadas = 0

  const subconjuntos: LoteTrigo[][] = []
  const combinar = (inicio: number, atual: LoteTrigo[]) => {
    if (atual.length > 0) subconjuntos.push([...atual])
    if (atual.length === MAX_LOTES) return
    for (let i = inicio; i < elegiveis.length; i += 1) combinar(i + 1, [...atual, elegiveis[i]])
  }
  combinar(0, [])

  for (const sub of subconjuntos) {
    for (const pcts of GRADES[sub.length - 1]) {
      combinacoesAvaliadas += 1
      const partes = sub.map((lote, i) => ({
        lote,
        fracao: pcts[i] / 100,
        toneladas: (volumeT * pcts[i]) / 100,
      }))
      // Cada parte tem de caber no silo do lote.
      if (partes.some((p) => p.toneladas > p.lote.quantidadeT)) continue
      const qualidade = misturarQualidade(partes)
      if (avaliarAderencia(qualidade, spec).some((a) => !a.atende)) continue
      const custo = partes.reduce((acc, p) => acc + p.lote.custoRsT * p.fracao, 0)
      if (!melhor || custo < melhor.custo - 1e-9) {
        melhor = {
          custo,
          qualidade,
          partes: partes.map((p, i) => ({
            loteId: p.lote.id,
            origemId: p.lote.origemId,
            pct: pcts[i],
            toneladas: Math.round(p.toneladas),
            custoRsT: p.lote.custoRsT,
          })),
        }
      }
    }
  }

  if (!melhor) {
    return {
      farinhaId,
      volumeT,
      partes: [],
      custoRsT: 0,
      qualidade: misturarQualidade([{ lote: LOTES_TRIGO[0], fracao: 1 }]),
      aderencia: [],
      atendeSpec: false,
      descartados,
      combinacoesAvaliadas,
      racional:
        'Nenhuma combinação de até 3 lotes disponíveis atende a especificação neste volume. É caso de comprar trigo com a qualidade que falta ou revisar a spec com a Indústria.',
    }
  }

  const aderencia = avaliarAderencia(melhor.qualidade, spec)
  const apertado = aderencia.filter((a) => a.folgaRotulo === 'no limite')
  const origemRepete = (id: OrigemId) =>
    melhor!.partes.filter((x) => x.origemId === id).length > 1
  const composicao = melhor.partes
    .map(
      (p) =>
        `${p.pct}% ${getOrigem(p.origemId)?.nome ?? p.origemId}` +
        (origemRepete(p.origemId) ? ` (${p.loteId})` : ''),
    )
    .join(' + ')

  return {
    farinhaId,
    volumeT,
    partes: melhor.partes,
    custoRsT: arred(melhor.custo, 1),
    qualidade: melhor.qualidade,
    aderencia,
    atendeSpec: true,
    descartados,
    combinacoesAvaliadas,
    racional:
      `${composicao} é a combinação mais barata que atende a spec inteira, a ${arred(melhor.custo, 1).toFixed(1).replace('.', ',')} R$/t de trigo. ` +
      (apertado.length > 0
        ? `${apertado.map((a) => a.rotulo).join(' e ')} ${apertado.length === 1 ? 'fica' : 'ficam'} no limite: qualquer variação do lote derruba o blend fora da spec.`
        : 'Todos os parâmetros com folga contra os limites.'),
  }
}

// ---------------------------------------------------------------------------
// Análise por lote
// ---------------------------------------------------------------------------

export type AlertaLote = 'ok' | 'envelhecendo' | 'critico' | 'incompativel' | 'bloqueado'

export interface AnaliseLote {
  lote: LoteTrigo
  idadeDias: number
  /** Specs que este lote atende SOZINHO (100% dele). */
  atendeSozinho: FarinhaId[]
  /** O lote pode entrar no blend planejado (mesmo que não sozinho). */
  compativelComPlanejado: boolean
  alerta: AlertaLote
  /** O que fazer com o lote — a ação que a tela sugere. */
  recomendacao: string
}

/**
 * Analisa cada lote contra a farinha planejada: idade, compatibilidade e o
 * destino alternativo quando a qualidade não serve ao blend do dia.
 */
export function analisarLotes(farinhaPlanejada: FarinhaId): AnaliseLote[] {
  return LOTES_TRIGO.map((lote) => {
    const idadeDias = idadeLoteDias(lote)
    const atendeSozinho = (Object.keys(ESPECIFICACOES_BLEND) as FarinhaId[]).filter((f) =>
      avaliarAderencia(lote.qualidade, ESPECIFICACOES_BLEND[f]).every((a) => a.atende),
    )
    const specPlanejada = ESPECIFICACOES_BLEND[farinhaPlanejada]
    // Um lote é incompatível com o blend quando estoura um limite que a
    // mistura NÃO consegue diluir: DON e umidade sobem com a média, então um
    // lote muito acima do teto contamina qualquer proporção relevante.
    const violaDon = specPlanejada.don.max != null && lote.qualidade.don > specPlanejada.don.max
    const compativelComPlanejado = !violaDon && lote.status !== 'bloqueado'

    const alerta: AlertaLote =
      lote.status === 'bloqueado'
        ? 'bloqueado'
        : idadeDias >= IDADE_CRITICA_DIAS
          ? 'critico'
          : !compativelComPlanejado
            ? 'incompativel'
            : idadeDias >= IDADE_ATENCAO_DIAS
              ? 'envelhecendo'
              : 'ok'

    const outrosDestinos = atendeSozinho.filter((f) => f !== farinhaPlanejada)
    const recomendacao =
      lote.status === 'bloqueado'
        ? `Bloqueado: DON de ${lote.qualidade.don} ppb acima da política. Liberar só com novo laudo ou destinar a ração.`
        : alerta === 'critico'
          ? `${idadeDias} dias em silo: girar com prioridade. ${outrosDestinos.length > 0 ? `Atende ${outrosDestinos.length} outra(s) spec(s) — direcionar para lá.` : 'Não atende nenhuma spec sozinho: usar diluído em blend.'}`
          : alerta === 'incompativel'
            ? `DON de ${lote.qualidade.don} ppb acima do teto da spec planejada. ${outrosDestinos.length > 0 ? `Direcionar para ${outrosDestinos.join(', ')}.` : 'Sem destino compatível no portfólio atual.'}`
            : alerta === 'envelhecendo'
              ? `${idadeDias} dias em silo: programar consumo antes de ${IDADE_CRITICA_DIAS} dias.`
              : atendeSozinho.includes(farinhaPlanejada)
                ? 'Atende a spec planejada sozinho — pode ir puro ou como base do blend.'
                : 'Entra no blend como componente; sozinho não fecha a spec.'

    return { lote, idadeDias, atendeSozinho, compativelComPlanejado, alerta, recomendacao }
  })
}

/** Volumes de moagem programada (t de trigo) que a tela oferece. O blend é
 * definido por LOTE DE MOAGEM, não pela compra do trimestre: são os silos que
 * limitam, e uma batelada realista é o que o moinho consome em ~2 semanas. */
export const VOLUMES_MOAGEM_T = [6_000, 12_000, 18_000] as const
export const VOLUME_MOAGEM_PADRAO_T = 12_000

/** Total em silo (t) e valor imobilizado (R$). */
export const TOTAL_ESTOQUE_T = LOTES_TRIGO.reduce((s, l) => s + l.quantidadeT, 0)
export const VALOR_ESTOQUE_RS = LOTES_TRIGO.reduce((s, l) => s + l.quantidadeT * l.custoRsT, 0)
