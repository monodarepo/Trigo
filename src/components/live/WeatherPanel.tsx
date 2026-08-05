import { Badge, Card, Pill } from '../ui'
import { SourceBadge } from '../trust/SourceBadge'
import { useClimaRegioesAoVivo, useFrescorRelativo, type ClimaRegiaoSinal } from '../../live/useLiveData'
import { FONTE_OPEN_METEO } from '../../data'
import { colors } from '../../theme/tokens'

const fmt1 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Mini-área de precipitação (16 dias) — SVG puro, sem eixo (decorativo com aria). */
function MiniAreaChuva({ valores, rotulo }: { valores: number[]; rotulo: string }) {
  const largura = 132
  const altura = 34
  const max = Math.max(2, ...valores)
  const passo = largura / Math.max(1, valores.length - 1)
  const pontos = valores.map((v, i) => `${(i * passo).toFixed(1)},${(altura - (v / max) * (altura - 4)).toFixed(1)}`)
  const caminho = `M0,${altura} L${pontos.join(' L')} L${largura},${altura} Z`
  return (
    <svg width={largura} height={altura} role="img" aria-label={rotulo} className="mt-2 block">
      <path d={caminho} fill={colors.semantic.info} fillOpacity={0.22} />
      <polyline points={pontos.join(' ')} fill="none" stroke={colors.semantic.info} strokeWidth={1.5} />
    </svg>
  )
}

function CartaoRegiao({ sinal }: { sinal: ClimaRegiaoSinal }) {
  const { regiao, clima, cenario, risco, isLive } = sinal
  const chuva16d = clima?.previsao?.reduce((s, p) => s + p.chuvaMm, 0) ?? null
  const tMax16d = clima?.previsao?.reduce((m, p) => Math.max(m, p.tMaxC), -Infinity)
  return (
    <div className="min-w-0 rounded-card border border-edge/60 bg-navy/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-ink">{regiao.rotulo}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <Pill tone="neutral">{regiao.papel === 'origem' ? 'Origem' : 'Porto'}</Pill>
            {!isLive && <span className="font-mono text-11 text-ink-faint">cenário</span>}
          </div>
        </div>
        <Badge kind="risco" level={risco.nivel} className="shrink-0" />
      </div>

      {isLive && clima ? (
        <>
          <p className="tnums mt-2 font-mono text-13 font-semibold text-ink">
            {fmt1(clima.temperaturaC)}°C agora
            <span className="ml-1.5 font-normal text-ink-subtle">
              · máx 16d {tMax16d != null && Number.isFinite(tMax16d) ? `${fmt1(tMax16d)}°C` : '—'}
            </span>
          </p>
          <p className="tnums mt-0.5 font-mono text-11 text-ink-subtle">
            chuva 7d {clima.chuva7dMm == null ? '—' : fmt1(clima.chuva7dMm)} mm · próx. 16d{' '}
            {chuva16d == null ? '—' : fmt1(chuva16d)} mm
          </p>
          <MiniAreaChuva
            valores={(clima.previsao ?? []).map((p) => p.chuvaMm)}
            rotulo={`Precipitação prevista por dia (16 dias) em ${regiao.rotulo}`}
          />
          <p className="mt-1.5 text-11 leading-snug text-ink-faint">{risco.motivo}</p>
        </>
      ) : (
        <>
          <p className="tnums mt-2 font-mono text-13 font-semibold text-ink">
            {fmt1(cenario.tMaxC)}°C máx
            <span className="ml-1.5 font-normal text-ink-subtle">· chuva 7d {fmt1(cenario.chuva7dMm)} mm</span>
          </p>
          {/* Em cenário, o motivo do risco É o resumo — uma linha só */}
          <p className="mt-1 text-11 leading-snug text-ink-subtle">{cenario.resumo}</p>
        </>
      )}
    </div>
  )
}

/**
 * Painel Clima & Safra: clima real (Open-Meteo, previsão 16d) nas regiões de
 * trigo — a anomalia vira sinal de risco de safra/qualidade. Em Cenário ou
 * falha, cada região cai no clima encenado do snapshot.
 */
export function WeatherPanel({ className = '' }: { className?: string }) {
  const regioes = useClimaRegioesAoVivo()
  const primeiraViva = regioes.find((r) => r.isLive)
  const frescor = useFrescorRelativo(primeiraViva?.updatedAt ?? null)

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-ink">Clima & Safra — regiões de trigo</h3>
          <p className="mt-0.5 text-xs text-ink-subtle">
            Previsão de 16 dias por origem/porto — anomalia de chuva vira risco de safra e de qualidade.
          </p>
          <div className="-ml-1.5 mt-1">
            {primeiraViva ? (
              <SourceBadge familia="safra" fonteOverride={FONTE_OPEN_METEO} frescorOverride={frescor ?? undefined} />
            ) : (
              <SourceBadge familia="safra" />
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {regioes.map((sinal) => (
          <CartaoRegiao key={sinal.regiao.id} sinal={sinal} />
        ))}
      </div>
    </Card>
  )
}
