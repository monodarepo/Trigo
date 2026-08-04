import type { ReactNode } from 'react'

export interface DataTableColumn<T> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  render: (row: T) => ReactNode
}

export interface DataTableProps<T> {
  columns: readonly DataTableColumn<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string
  /** Descrição acessível da tabela (sr-only). */
  caption?: string
  className?: string
}

const alignClasses = {
  left: 'text-left',
  right: 'tnums text-right',
  center: 'text-center',
}

export function DataTable<T>({ columns, rows, rowKey, caption, className = '' }: DataTableProps<T>) {
  return (
    <div
      className={`overflow-x-auto rounded-card-lg border border-edge/80 bg-card shadow-card ${className}`}
    >
      <table className="w-full min-w-[560px] border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-edge/80">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle ${alignClasses[column.align ?? 'left']}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row)}
              className={`border-b border-edge/40 last:border-b-0 ${index % 2 === 1 ? 'bg-white/[0.02]' : ''}`}
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
