import { Card } from '../ui'
import { useClimaAoVivo, useFxAoVivo, useWheatAoVivo, type SinalAoVivo } from '../../live/useLiveData'
import { ZONA_NUCLEO_ROSARIO } from '../../live/providers/weather'

const fmtNum = (v: number, casas: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

function Sinal<T>({ rotulo, valor, sinal, fonteRotulo }: { rotulo: string; valor: string; sinal: SinalAoVivo<T>; fonteRotulo: string }) {
  const frescor =
    sinal.isLive && sinal.updatedAt
      ? new Date(sinal.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : null
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${sinal.isLive ? 'bg-positive/80' : 'bg-ink-faint/60'}`}
        aria-hidden="true"
      />
      <span className="text-11 font-medium uppercase tracking-wide text-ink-faint">{rotulo}</span>
      <span className="tnums font-mono text-12 font-semibold text-ink">{sinal.isLoading ? '…' : valor}</span>
      <span className="tnums font-mono text-11 text-ink-faint">
        {sinal.isLive ? `${fonteRotulo} · ${frescor}` : 'cenário'}
      </span>
    </span>
  )
}

/**
 * Periferia ao vivo, núcleo encenado: sinais externos de referência (FX real,
 * clima na zona núcleo, trigo) com fonte + frescor + fallback. Nenhum número
 * de DECISÃO (TLC, R$ 4,8M, blend, hedge) passa por aqui.
 */
export function SinaisExternos({ className = '' }: { className?: string }) {
  const fx = useFxAoVivo()
  const clima = useClimaAoVivo()
  const wheat = useWheatAoVivo()

  return (
    <Card padding="sm" className={className}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="eyebrow shrink-0">Sinais externos</span>
        <Sinal
          rotulo="Câmbio spot"
          valor={`R$ ${fmtNum(fx.value.taxa, 2)}`}
          sinal={fx}
          fonteRotulo="Frankfurter/BCE"
        />
        <Sinal
          rotulo={ZONA_NUCLEO_ROSARIO.rotulo}
          valor={`${fmtNum(clima.value.temperaturaC, 1)}°C · chuva 7d ${
            clima.value.chuva7dMm == null ? '—' : fmtNum(clima.value.chuva7dMm, 1)
          } mm`}
          sinal={clima}
          fonteRotulo="Open-Meteo"
        />
        <Sinal
          rotulo="Trigo ref. mensal"
          valor={`US$ ${fmtNum(wheat.value.precoUsdT, 0)}/t${wheat.isLive ? ` (${wheat.value.data.slice(0, 7)})` : ''}${wheat.value.stale ? ' · cache' : ''}`}
          sinal={wheat}
          fonteRotulo="FRED via Alpha Vantage"
        />
        <span className="ml-auto text-11 italic text-ink-faint">
          Referência externa — não altera a decisão (núcleo encenado).
        </span>
      </div>
    </Card>
  )
}
