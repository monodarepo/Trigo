import { useId, useState } from 'react'
import { fonteDe, type ConfiabilidadeFonte, type FamiliaDado, type FonteDado, type MetodoFonte } from '../../data'
import { useLive } from '../../live/liveStore'

const COR_CONFIABILIDADE: Record<ConfiabilidadeFonte, { ponto: string; texto: string; rotulo: string }> = {
  alta: { ponto: 'bg-positive/80', texto: 'text-positive', rotulo: 'Alta' },
  media: { ponto: 'bg-warning/80', texto: 'text-warning', rotulo: 'Média' },
  baixa: { ponto: 'bg-danger/80', texto: 'text-danger', rotulo: 'Baixa' },
}

const METODO_ROTULO: Record<MetodoFonte, string> = {
  'tempo-real': 'Tempo real (feed contínuo)',
  diario: 'Carga diária',
  contrato: 'Por contrato / evento',
}

/**
 * Detalhe de proveniência de uma fonte — o conteúdo do popover do SourceBadge.
 * Exportado à parte para virar a aba "Fonte" do WhyPopover (R5).
 */
export function DetalheFonte({ fonte, frescor }: { fonte: FonteDado; frescor: string }) {
  const conf = COR_CONFIABILIDADE[fonte.confiabilidade]
  return (
    <div className="w-72 rounded-card border border-edge bg-card-2 p-3 text-left shadow-raised">
      <p className="eyebrow">{fonte.rotulo}</p>
      <p className="mt-1 text-xs font-medium leading-snug text-ink">{fonte.fonte}</p>
      <dl className="mt-2 space-y-1 border-t border-edge/60 pt-2 text-[11px]">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="shrink-0 text-ink-faint">Método</dt>
          <dd className="text-right text-ink-muted">{METODO_ROTULO[fonte.metodo]}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="shrink-0 text-ink-faint">Atualização</dt>
          <dd className="tnums text-right font-mono text-ink-muted">{frescor}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="shrink-0 text-ink-faint">Confiabilidade</dt>
          <dd className={`text-right font-semibold ${conf.texto}`}>{conf.rotulo}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="shrink-0 text-ink-faint">Responsável</dt>
          <dd className="text-right text-ink-muted">{fonte.responsavel}</dd>
        </div>
      </dl>
      <p className="mt-2 border-t border-edge/60 pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
        Validações
      </p>
      <ul className="mt-1 space-y-1">
        {fonte.validacoes.map((v) => (
          <li key={v} className="flex gap-1.5 text-[11px] leading-snug text-ink-subtle">
            <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-edge-strong" aria-hidden="true" />
            {v}
          </li>
        ))}
      </ul>
    </div>
  )
}

export interface SourceBadgeProps {
  familia: FamiliaDado
  /** Substitui a fonte encenada (ex.: Frankfurter quando o câmbio está ao vivo). */
  fonteOverride?: FonteDado
  /** Substitui o rótulo de frescor (ex.: "há 12s" do updatedAt do react-query). */
  frescorOverride?: string
  /** Lado em que o popover abre (default: abaixo). */
  posicao?: 'acima' | 'abaixo'
  className?: string
}

/**
 * Selo discreto de proveniência: "CBOT · há 12s". Hover/foco expande o
 * detalhe (fonte, método, frescor, confiabilidade, dono, validações).
 * Famílias tempo-real correm com o tick global; as demais mostram a última carga.
 */
export function SourceBadge({ familia, fonteOverride, frescorOverride, posicao = 'abaixo', className = '' }: SourceBadgeProps) {
  const [aberto, setAberto] = useState(false)
  const idPopover = useId()
  const fonte = fonteOverride ?? fonteDe(familia)
  const segundos = useLive((s) => s.atualizadoHaS)
  const tempoReal = fonte.metodo === 'tempo-real'
  const frescor = frescorOverride ?? (tempoReal ? `há ${segundos}s` : fonte.frescorRotulo)
  const conf = COR_CONFIABILIDADE[fonte.confiabilidade]

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={() => setAberto(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setAberto(false)
          ;(e.target as HTMLElement).blur()
        }
      }}
    >
      <button
        type="button"
        aria-label={`Proveniência: ${fonte.rotulo} — fonte ${fonte.fonteCurta}, confiabilidade ${conf.rotulo.toLowerCase()}`}
        aria-expanded={aberto}
        aria-describedby={aberto ? idPopover : undefined}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-1.5 py-0.5 font-mono text-11 text-ink-faint transition-colors hover:border-edge hover:bg-white/[0.03] hover:text-ink-subtle focus-visible:border-edge focus-visible:text-ink-subtle"
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${conf.ponto}`} aria-hidden="true" />
        <span className="tnums whitespace-nowrap">
          {fonte.fonteCurta} · {frescor}
        </span>
      </button>
      {aberto && (
        <div
          id={idPopover}
          role="tooltip"
          className={`absolute left-1/2 z-40 -translate-x-1/2 ${posicao === 'acima' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          <DetalheFonte fonte={fonte} frescor={frescor} />
        </div>
      )}
    </span>
  )
}
