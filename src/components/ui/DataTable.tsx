import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

export interface DataTableColumn<T> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  render: (row: T) => ReactNode
  /** Habilita ordenação por esta coluna (clique no cabeçalho). */
  sortValue?: (row: T) => number | string
}

export interface DataTableProps<T> {
  columns: readonly DataTableColumn<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string
  /** Descrição acessível da tabela (sr-only). */
  caption?: string
  /** Largura mínima da tabela em px antes de rolar horizontalmente (default 560). */
  minWidth?: number
  /** Classes extras por linha (ex.: destacar a recomendada). */
  rowClassName?: (row: T, index: number) => string
  className?: string
}

const alignClasses = {
  left: 'text-left',
  right: 'tnums text-right',
  center: 'text-center',
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  minWidth = 560,
  rowClassName,
  className = '',
}: DataTableProps<T>) {
  const [ordem, setOrdem] = useState<{ key: string; dir: 1 | -1 } | null>(null)

  const linhas = useMemo(() => {
    if (!ordem) return rows
    const coluna = columns.find((c) => c.key === ordem.key)
    if (!coluna?.sortValue) return rows
    return [...rows].sort((a, b) => {
      const va = coluna.sortValue!(a)
      const vb = coluna.sortValue!(b)
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return cmp * ordem.dir
    })
  }, [rows, columns, ordem])

  const alterna = (key: string) =>
    setOrdem((atual) => (atual?.key !== key ? { key, dir: -1 } : atual.dir === -1 ? { key, dir: 1 } : null))

  return (
    <div
      className={`overflow-x-auto rounded-card-lg border border-edge/80 bg-card shadow-card ${className}`}
    >
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-edge/80">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={
                  ordem?.key === column.key ? (ordem.dir === 1 ? 'ascending' : 'descending') : undefined
                }
                className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle ${alignClasses[column.align ?? 'left']}`}
              >
                {column.sortValue ? (
                  <button
                    type="button"
                    onClick={() => alterna(column.key)}
                    className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-ink ${
                      ordem?.key === column.key ? 'text-gold-light' : ''
                    }`}
                  >
                    {column.header}
                    {ordem?.key === column.key ? (
                      ordem.dir === 1 ? (
                        <ArrowUp size={11} aria-hidden="true" />
                      ) : (
                        <ArrowDown size={11} aria-hidden="true" />
                      )
                    ) : (
                      <ArrowUpDown size={11} className="opacity-50" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((row, index) => (
            <tr
              key={rowKey(row)}
              className={`border-b border-edge/40 last:border-b-0 ${index % 2 === 1 ? 'bg-white/[0.02]' : ''} ${rowClassName?.(row, index) ?? ''}`}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 text-ink-muted ${alignClasses[column.align ?? 'left']}`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
