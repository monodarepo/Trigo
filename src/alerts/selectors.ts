/**
 * Seletores derivados do store de alertas.
 *
 * Todos são MEMOIZADOS contra a referência da lista. Isso não é otimização
 * prematura: `useSyncExternalStore` compara o resultado do seletor por
 * `Object.is`, então um `.filter()` que devolve array novo a cada chamada
 * dispara re-render infinito. Memoizar pela referência da lista resolve os
 * dois problemas de uma vez — estabilidade e custo.
 */
import type { Alerta, CategoriaAlerta, SeveridadeAlerta } from '../data/types'

/** Cache de uma entrada por seletor, chaveado pela referência da lista. */
function memoPorLista<T>(calcular: (lista: readonly Alerta[]) => T) {
  let ultimaLista: readonly Alerta[] | null = null
  let ultimoValor: T
  return (lista: readonly Alerta[]): T => {
    if (lista !== ultimaLista) {
      ultimaLista = lista
      ultimoValor = calcular(lista)
    }
    return ultimoValor
  }
}

/** Peso da severidade na ordenação — menor é mais urgente. */
const PESO_SEVERIDADE: Record<SeveridadeAlerta, number> = {
  critico: 0,
  alto: 1,
  medio: 2,
  informativo: 3,
}

export const ORDEM_SEVERIDADE = PESO_SEVERIDADE

/**
 * ATIVOS = tudo que não foi resolvido. Adiado continua ativo de propósito: ele
 * sai da FILA (abaixo), não da lista — um risco adiado que sumisse da tela
 * seria um risco esquecido.
 */
export const ativos = memoPorLista((lista) => lista.filter((a) => a.status !== 'resolvido'))

/** Contagem por severidade, só entre os ativos. */
export const porSeveridade = memoPorLista((lista) => {
  const contagem: Record<SeveridadeAlerta, number> = { critico: 0, alto: 0, medio: 0, informativo: 0 }
  for (const a of ativos(lista)) contagem[a.severidade]++
  return contagem
})

/** Contagem por categoria — alimenta os chips de filtro. */
export const porCategoria = memoPorLista((lista) => {
  const contagem = {} as Record<CategoriaAlerta, number>
  for (const a of ativos(lista)) contagem[a.categoria] = (contagem[a.categoria] ?? 0) + 1
  return contagem
})

export const contagemCritica = memoPorLista((lista) => porSeveridade(lista).critico)

/**
 * O número do sino: o que ainda não passou pelos olhos de ninguém. Antes o
 * badge mostrava "críticos + altos" fixo — não descia ao ler, e por isso não
 * era notificação, era etiqueta.
 */
export const naoVistos = memoPorLista((lista) =>
  ativos(lista).filter((a) => a.status === 'novo'),
)

export const contagemNaoVistos = memoPorLista((lista) => naoVistos(lista).length)

/**
 * FILA DE DECISÃO: o que exige ação humana, ordenado por urgência e depois por
 * dinheiro. Severidade primeiro porque um crítico de R$ 100 mil precede um
 * médio de R$ 1M — urgência não se compra com impacto; o impacto desempata
 * dentro do mesmo nível.
 *
 * Adiado e reconhecido saem da fila: já tiveram uma decisão (esperar, assumir).
 */
export const filaExigeDecisao = memoPorLista((lista) =>
  ativos(lista)
    .filter((a) => a.exigeDecisao && a.status !== 'adiado' && a.status !== 'reconhecido')
    .sort(
      (a, b) =>
        PESO_SEVERIDADE[a.severidade] - PESO_SEVERIDADE[b.severidade] ||
        (b.impactoRs ?? 0) - (a.impactoRs ?? 0) ||
        b.timestamp.localeCompare(a.timestamp),
    ),
)

/** O alerta mais crítico da fila — o que o cockpit destaca. */
export const maisCritico = memoPorLista((lista) => filaExigeDecisao(lista)[0] ?? null)

/**
 * Memoização para seletores COM ARGUMENTO. Vale a mesma regra dos demais, e
 * aqui ela é ainda mais crítica: sem cache, `useAlertas((l) => paraTela(l, r))`
 * devolve array novo a cada render, `useSyncExternalStore` compara por
 * Object.is, conclui que o estado mudou e re-renderiza para sempre — foi
 * exatamente assim que Hedge, Compra e a Visão Executiva entraram em laço
 * (React #185) na primeira ligação ao store.
 */
function memoPorListaEChave<T>(calcular: (lista: readonly Alerta[], chave: string) => T) {
  let ultimaLista: readonly Alerta[] | null = null
  let cache = new Map<string, T>()
  return (lista: readonly Alerta[], chave: string): T => {
    if (lista !== ultimaLista) {
      ultimaLista = lista
      cache = new Map()
    }
    if (!cache.has(chave)) cache.set(chave, calcular(lista, chave))
    return cache.get(chave)!
  }
}

/**
 * Alertas de uma tela, para o banner contextual. A rota entra na lista de
 * `telasRelacionadas` do alerta — é o próprio alerta que declara onde aparece,
 * em vez de cada tela manter o seu filtro (que era a duplicação anterior:
 * Hedge filtrava por categoria, Compra por texto do título).
 */
export const paraTela = memoPorListaEChave((lista, rota) =>
  ativos(lista)
    .filter((a) => a.telasRelacionadas.includes(rota))
    .sort((a, b) => PESO_SEVERIDADE[a.severidade] - PESO_SEVERIDADE[b.severidade]),
)

/** Alertas ligados a um objeto do domínio — o banner dentro do ObjectPanel. */
export const paraEntidade = memoPorListaEChave((lista, id) =>
  ativos(lista)
    .filter((a) => a.entidade?.id === id)
    .sort((a, b) => PESO_SEVERIDADE[a.severidade] - PESO_SEVERIDADE[b.severidade]),
)

/** Ids dos objetos com alerta ATIVO que exige decisão — destaque de linha. */
export const entidadesComAlerta = memoPorLista(
  (lista) =>
    new Set(
      ativos(lista)
        .filter((a) => a.exigeDecisao && a.entidade)
        .map((a) => a.entidade!.id),
    ),
)

/** Os N primeiros da fila — memoizado porque `.slice()` cria array novo. */
export const topoDaFila = memoPorListaEChave((lista, n) =>
  filaExigeDecisao(lista).slice(0, Number(n)),
)

export interface ImpactoTotal {
  /** Soma dos impactos MENSAIS marcados como oportunidade (R$). */
  oportunidadeRs: number
  /** Soma dos impactos MENSAIS marcados como risco (R$). */
  riscoRs: number
  /** O que está em jogo no mês: o que se captura mais o que se evita. */
  emJogoRs: number
  /** Fora da conta mensal, listados à parte para não sumirem. */
  foraDaBaseMensal: Array<{ id: string; titulo: string; impactoRs: number; base: string }>
}

/**
 * IMPACTO TOTAL. Só entram os alertas de base MENSAL e que exigem decisão:
 * somar um desvio trimestral de orçamento (R$ 5,3M) com um custo mensal de
 * armazenagem daria um total que não é nem mês nem trimestre. Risco e
 * oportunidade andam separados porque R$ 1 a capturar e R$ 1 a evitar exigem
 * times, prazos e decisões diferentes — o líquido esconderia isso.
 */
export const impactoTotal = memoPorLista((lista): ImpactoTotal => {
  let oportunidadeRs = 0
  let riscoRs = 0
  const foraDaBaseMensal: ImpactoTotal['foraDaBaseMensal'] = []

  for (const a of ativos(lista)) {
    if (a.impactoRs == null || !a.exigeDecisao) continue
    if (a.impactoBase !== 'mes') {
      foraDaBaseMensal.push({
        id: a.id,
        titulo: a.titulo,
        impactoRs: a.impactoRs,
        base: a.impactoBase ?? 'evento',
      })
      continue
    }
    if (a.tipo === 'oportunidade') oportunidadeRs += a.impactoRs
    else riscoRs += a.impactoRs
  }

  return { oportunidadeRs, riscoRs, emJogoRs: oportunidadeRs + riscoRs, foraDaBaseMensal }
})
