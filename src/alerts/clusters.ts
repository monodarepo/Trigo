/**
 * CLUSTERING — vários sinais do MESMO fato viram uma linha só.
 *
 * O atraso do MV Río Paraná acende dois alertas (o navio e a cobertura do
 * Moinho Natal que ele derruba); a alternativa russa acende dois (a restrição
 * de exportação e o laudo de DON reprovado); Rolândia acende três (capacidade
 * mínima, câmbio que vira a decisão, farinha sem destino). Listados soltos,
 * ocupam sete linhas da fila e fazem o operador ler o mesmo fato três vezes —
 * é assim que uma fila de exceção vira papel de parede.
 *
 * A chave é `eventoId` quando existe (mesmo FATO em objetos diferentes) e a
 * entidade quando não (mesmo OBJETO, fatos diferentes). Nessa ordem: um
 * evento atravessa entidades, então precisa vencer.
 *
 * Cluster de um só alerta não é cluster — sai como linha normal, sem contorno
 * nem contagem. Agrupar o que não tem par só acrescentaria moldura.
 */
import type { Alerta } from '../data/types'
import { porUrgencia } from './selectors'

export interface ClusterAlertas {
  /** Chave estável — `evt:<id>` ou `<tipo>:<id>`; para solitários, o id do alerta. */
  chave: string
  /** O alerta que representa o grupo: o primeiro pela ordem única de urgência. */
  principal: Alerta
  /** Os demais, já ordenados. Vazio quando não há agrupamento. */
  relacionados: readonly Alerta[]
  /** Total de sinais (1 quando solitário). */
  total: number
  /** Rótulo do fato/objeto que une o grupo — vazio quando solitário. */
  rotulo: string
}

/** `evt:` prefixado para que um eventoId nunca colida com uma entidade. */
function chaveDe(a: Alerta): string | null {
  if (a.eventoId) return `evt:${a.eventoId}`
  if (a.entidade) return `${a.entidade.tipo}:${a.entidade.id}`
  return null
}

/**
 * Soma os impactos do grupo na MESMA base. Bases diferentes não se somam —
 * um desvio trimestral e um custo mensal dariam um total que não é nem um nem
 * outro —, então o grupo só anuncia total quando as bases batem.
 */
export function impactoDoCluster(c: ClusterAlertas): { rs: number; base: Alerta['impactoBase'] } | null {
  const comNumero = [c.principal, ...c.relacionados].filter((a) => a.impactoRs != null)
  /* Menos de dois números não é soma: repetir o impacto do principal com o
     rótulo "no grupo" sugere um total que não existe. */
  if (comNumero.length < 2) return null
  const base = comNumero[0].impactoBase
  if (comNumero.some((a) => a.impactoBase !== base)) return null
  // Risco e oportunidade também não se somam: são decisões diferentes.
  const tipo = comNumero[0].tipo
  if (comNumero.some((a) => a.tipo !== tipo)) return null
  return { rs: comNumero.reduce((s, a) => s + (a.impactoRs ?? 0), 0), base }
}

/** Rótulo humano do que une o grupo. */
function rotuloDe(a: Alerta, nomeMoinho: (id: string) => string): string {
  if (a.eventoId && a.entidade?.tipo === 'navio') return `sinais do navio`
  if (a.eventoId) return 'sinais do mesmo evento'
  if (!a.entidade) return 'sinais relacionados'
  if (a.entidade.tipo === 'moinho') return `sinais de ${nomeMoinho(a.entidade.id)}`
  return `sinais de ${a.entidade.tipo}`
}

/**
 * Agrupa preservando a ORDEM DA FILA: o cluster ocupa a posição do seu alerta
 * mais urgente. Agrupar primeiro e ordenar depois faria um grupo de médios
 * subir na frente de um crítico solitário só por ser maior.
 */
export function agruparEmClusters(
  alertas: readonly Alerta[],
  nomeMoinho: (id: string) => string = (id) => id,
): ClusterAlertas[] {
  const ordenados = [...alertas].sort(porUrgencia)
  const porChave = new Map<string, Alerta[]>()
  for (const a of ordenados) {
    const k = chaveDe(a)
    if (!k) continue
    porChave.set(k, [...(porChave.get(k) ?? []), a])
  }

  const jaSaiu = new Set<string>()
  const clusters: ClusterAlertas[] = []
  for (const a of ordenados) {
    if (jaSaiu.has(a.id)) continue
    const k = chaveDe(a)
    const grupo = k ? (porChave.get(k) ?? []) : []
    if (grupo.length > 1) {
      grupo.forEach((g) => jaSaiu.add(g.id))
      clusters.push({
        chave: k!,
        principal: grupo[0],
        relacionados: grupo.slice(1),
        total: grupo.length,
        rotulo: rotuloDe(grupo[0], nomeMoinho),
      })
    } else {
      jaSaiu.add(a.id)
      clusters.push({ chave: a.id, principal: a, relacionados: [], total: 1, rotulo: '' })
    }
  }
  return clusters
}

/** Achata de volta — útil para seleção em massa e contagens. */
export function alertasDoCluster(c: ClusterAlertas): readonly Alerta[] {
  return [c.principal, ...c.relacionados]
}
