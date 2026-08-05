import { ROTULO_SEMAFORO, type SemaforoMoinho } from '../../data'
import { formatPct, formatTon } from '../../data/format'
import { toneBadgeClasses, type Tone } from '../ui/tones'

export interface UtilizacaoGaugeProps {
  /** Utilização atual da capacidade (%). */
  utilizacaoPct: number
  /** Capacidade econômica mínima (%): abaixo dela o custo pleno supera o mercado.
   *  null = nenhuma utilização torna a unidade competitiva. */
  utilizacaoMinimaPct: number | null
  semaforo: SemaforoMoinho
  /** Capacidade ociosa vendável (t de farinha/mês). */
  capacidadeOciosaT: number
  /** Texto curto explicando o estado (vem do motor). */
  diagnostico: string
  ariaLabel: string
}

const TOM: Record<SemaforoMoinho, Tone> = {
  verde: 'positive',
  ambar: 'warning',
  vermelho: 'danger',
}

const PREENCHIMENTO: Record<SemaforoMoinho, string> = {
  verde: 'bg-positive',
  ambar: 'bg-warning',
  vermelho: 'bg-danger',
}

const limitar = (v: number) => Math.min(100, Math.max(0, v))
const arred1 = (v: number) => Math.round(v * 10) / 10

/**
 * Medidor da utilização contra a CAPACIDADE ECONÔMICA MÍNIMA — barra horizontal
 * em divs (não é Recharts): trilha 0–100%, zona abaixo do mínimo sombreada em
 * risco, marcador no mínimo e preenchimento até a utilização atual.
 *
 * Sem `utilizacaoMinimaPct` a trilha inteira é zona de risco: não existe ponto
 * de operação que torne a unidade competitiva nesta spec — encher o moinho não
 * resolve, e o texto abaixo diz isso com todas as letras.
 */
export function UtilizacaoGauge({
  utilizacaoPct,
  utilizacaoMinimaPct,
  semaforo,
  capacidadeOciosaT,
  diagnostico,
  ariaLabel,
}: UtilizacaoGaugeProps) {
  const utilizacao = limitar(utilizacaoPct)
  const minimo = utilizacaoMinimaPct != null ? limitar(utilizacaoMinimaPct) : null
  const semMinimoViavel = minimo == null
  const folgaT = Math.max(0, Math.round(capacidadeOciosaT))

  // Ancoragem do rótulo do marcador: evita que ele vaze nas pontas da trilha.
  const ancoraMarcador = minimo == null ? '' : minimo < 14 ? 'none' : minimo > 86 ? 'translateX(-100%)' : 'translateX(-50%)'

  const textoValor = semMinimoViavel
    ? `${formatPct(utilizacaoPct, 1)} de utilização · nenhuma utilização torna a unidade competitiva`
    : `${formatPct(utilizacaoPct, 1)} de utilização · mínimo econômico ${formatPct(minimo, 1)}`

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Utilização da capacidade</p>
          <p className="tnums mt-1.5 font-display text-28 font-semibold leading-none text-ink">
            {formatPct(utilizacaoPct, 1)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-11 font-semibold ${toneBadgeClasses[TOM[semaforo]]}`}
        >
          {ROTULO_SEMAFORO[semaforo]}
        </span>
      </div>

      <div className="relative mt-5">
        <div
          role="meter"
          aria-label={ariaLabel}
          aria-valuenow={arred1(utilizacao)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={textoValor}
          className="relative h-3 overflow-hidden rounded-full border border-edge bg-surface-3"
        >
          {/* Preenchimento = utilização atual, na cor do semáforo. */}
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${PREENCHIMENTO[semaforo]}`}
            style={{ width: `${utilizacao}%` }}
            aria-hidden="true"
          />
          {/* Zona em que o custo pleno supera o mercado. Vem DEPOIS do
              preenchimento e é hachurada: desenhada antes, ficava escondida
              debaixo da barra opaca justamente quando há folga — o caso em que
              o usuário mais precisa ver onde está o limiar. */}
          <div
            className="absolute inset-y-0 left-0 border-r border-ink/40 bg-danger/25"
            style={{
              width: `${semMinimoViavel ? 100 : minimo}%`,
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 5px)',
            }}
            aria-hidden="true"
          />
        </div>
        {/* Marcador do mínimo econômico: atravessa a trilha para ler como limiar. */}
        {minimo != null && (
          <div
            className="pointer-events-none absolute -top-1.5 h-6 w-0.5 -translate-x-1/2 rounded-full bg-ink/70"
            style={{ left: `${minimo}%` }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="relative mt-2.5 h-4 text-11 text-ink-faint" aria-hidden="true">
        {(minimo == null || minimo >= 14) && <span className="tnums absolute left-0">0%</span>}
        {(minimo == null || minimo <= 86) && <span className="tnums absolute right-0">100%</span>}
        {minimo != null && (
          <span
            className="tnums absolute whitespace-nowrap text-ink-subtle"
            style={{ left: `${minimo}%`, transform: ancoraMarcador }}
          >
            mínimo econômico · {formatPct(minimo, 1)}
          </span>
        )}
      </div>

      {semMinimoViavel && (
        <p className="mt-2 text-12 leading-relaxed text-danger">
          Nenhuma utilização resolve: nem rodando a 100% o custo pleno fica abaixo do mercado nesta spec.
        </p>
      )}

      <div className="mt-4 border-t border-edge pt-3">
        <p className="text-13 text-ink-muted">
          {folgaT > 0 ? (
            <>
              <span className="tnums font-mono text-ink">{formatTon(folgaT)}/mês</span> de folga vendável
            </>
          ) : (
            'Sem folga vendável: a capacidade está tomada pela demanda interna.'
          )}
        </p>
        <p className="mt-1.5 text-12 leading-relaxed text-ink-subtle">{diagnostico}</p>
      </div>
    </div>
  )
}
