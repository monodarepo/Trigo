import { colors } from '../../theme/tokens'
import { formatBRL, formatTon } from '../../data/format'
import type { RegiaoComercial } from '../../data/types'

/**
 * Mapa operacional das regiões comerciais. É um ESQUEMA, não cartografia: as
 * regiões são blocos posicionados na orientação geográfica correta, o que
 * basta para ler "onde" sem fingir precisão de fronteira que o mockup não tem.
 * A exportação fica fora do continente, do lado do oceano, porque não é uma
 * região do país — é um destino.
 *
 * A intensidade da cor é a MARGEM TOTAL da região; o tamanho do bloco não
 * codifica nada (é geografia), então nenhuma leitura de área é sugerida.
 */

export interface RegiaoMapa {
  regiao: RegiaoComercial
  rotulo: string
  /** Oportunidades avaliadas na região. */
  oportunidades: number
  /** Volume somado das oportunidades vendáveis (t/mês). */
  volumeT: number
  /** Margem somada das oportunidades recomendadas (R$/mês). */
  margemRs: number
  /** Melhor margem unitária da região (R$/t) — a intensidade da cor. */
  melhorMargemRsT: number
  /** Alguma oportunidade da região rompe o abastecimento interno. */
  temRuptura: boolean
}

export interface OpsMapProps {
  dados: readonly RegiaoMapa[]
  /** Região destacada (a selecionada na tela). */
  selecionada?: RegiaoComercial | null
  onSelecionar?: (regiao: RegiaoComercial | null) => void
  ariaLabel: string
}

/** Blocos em coordenadas do viewBox 0 0 320 300 — orientação geográfica. */
const FORMAS: Record<RegiaoComercial, { d: string; cx: number; cy: number }> = {
  norte: {
    d: 'M28 34 h132 a10 10 0 0 1 10 10 v74 a10 10 0 0 1 -10 10 h-96 a10 10 0 0 1 -10 -10 v-30 h-26 a10 10 0 0 1 -10 -10 v-34 a10 10 0 0 1 10 -10 z',
    cx: 92,
    cy: 78,
  },
  nordeste: {
    d: 'M182 30 h72 a10 10 0 0 1 10 10 v96 a10 10 0 0 1 -10 10 h-72 a10 10 0 0 1 -10 -10 v-96 a10 10 0 0 1 10 -10 z',
    cx: 218,
    cy: 88,
  },
  'centro-oeste': {
    d: 'M74 140 h84 a10 10 0 0 1 10 10 v50 a10 10 0 0 1 -10 10 h-84 a10 10 0 0 1 -10 -10 v-50 a10 10 0 0 1 10 -10 z',
    cx: 116,
    cy: 175,
  },
  sudeste: {
    d: 'M182 158 h64 a10 10 0 0 1 10 10 v48 a10 10 0 0 1 -10 10 h-64 a10 10 0 0 1 -10 -10 v-48 a10 10 0 0 1 10 -10 z',
    cx: 214,
    cy: 192,
  },
  sul: {
    d: 'M96 224 h74 a10 10 0 0 1 10 10 v34 a10 10 0 0 1 -10 10 h-74 a10 10 0 0 1 -10 -10 v-34 a10 10 0 0 1 10 -10 z',
    cx: 133,
    cy: 251,
  },
  exportacao: {
    d: 'M272 176 h34 a8 8 0 0 1 8 8 v52 a8 8 0 0 1 -8 8 h-34 a8 8 0 0 1 -8 -8 v-52 a8 8 0 0 1 8 -8 z',
    cx: 289,
    cy: 210,
  },
}

const ORDEM: RegiaoComercial[] = [
  'norte',
  'nordeste',
  'centro-oeste',
  'sudeste',
  'sul',
  'exportacao',
]

export function OpsMap({ dados, selecionada, onSelecionar, ariaLabel }: OpsMapProps) {
  const porRegiao = new Map(dados.map((d) => [d.regiao, d]))
  const maiorMargem = Math.max(1, ...dados.map((d) => d.melhorMargemRsT))

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <svg
          viewBox="0 0 320 300"
          className="h-auto w-full max-w-[320px] shrink-0"
          role="img"
          aria-label={ariaLabel}
        >
          {/* Linha d'água: separa o continente do destino de exportação. */}
          <line
            x1={262}
            y1={20}
            x2={262}
            y2={286}
            stroke={colors.navy.border}
            strokeDasharray="3 5"
          />
          <text x={289} y={166} textAnchor="middle" fontSize={9} fill={colors.text.faint}>
            fora do país
          </text>

          {ORDEM.map((regiao) => {
            const d = porRegiao.get(regiao)
            const forma = FORMAS[regiao]
            const ativa = selecionada === regiao
            const semDados = !d || d.oportunidades === 0
            // Cor como sintaxe: dourado = valor, rosa = destruição de valor.
            // Pintar margem negativa de dourado claro sugeriria oportunidade.
            const negativa = !semDados && d.melhorMargemRsT < 0
            const intensidade = semDados
              ? 0.06
              : negativa
                ? 0.3
                : Math.max(0.12, d.melhorMargemRsT / maiorMargem)
            const clicavel = Boolean(onSelecionar) && !semDados
            return (
              <g
                key={regiao}
                onClick={
                  clicavel ? () => onSelecionar?.(ativa ? null : regiao) : undefined
                }
                style={{ cursor: clicavel ? 'pointer' : 'default' }}
              >
                <path
                  d={forma.d}
                  fill={semDados ? colors.surface.s3 : negativa ? colors.semantic.danger : colors.gold.primary}
                  fillOpacity={semDados ? 0.5 : intensidade}
                  stroke={ativa ? colors.gold.light : colors.navy.border}
                  strokeWidth={ativa ? 2 : 1}
                />
                {d && d.temRuptura && (
                  <circle
                    cx={forma.cx + 30}
                    cy={forma.cy - 22}
                    r={5}
                    fill={colors.semantic.danger}
                    stroke={colors.surface.base}
                    strokeWidth={1.5}
                  />
                )}
                <text
                  x={forma.cx}
                  y={forma.cy - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={ativa ? 700 : 500}
                  fill={ativa ? colors.gold.light : colors.text.muted}
                >
                  {d?.rotulo ?? regiao}
                </text>
                <text
                  x={forma.cx}
                  y={forma.cy + 10}
                  textAnchor="middle"
                  fontSize={10}
                  fill={semDados ? colors.text.faint : negativa ? colors.semantic.danger : colors.text.strong}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {semDados ? '—' : `${formatBRL(d.melhorMargemRsT, { casas: 0 })}/t`}
                </text>
              </g>
            )
          })}
        </svg>

        <ul className="min-w-0 flex-1 space-y-1.5">
          {[...dados]
            .sort((a, b) => b.melhorMargemRsT - a.melhorMargemRsT)
            .map((d) => {
              const ativa = selecionada === d.regiao
              return (
                <li key={d.regiao}>
                  <button
                    type="button"
                    onClick={() => onSelecionar?.(ativa ? null : d.regiao)}
                    aria-pressed={ativa}
                    className={`flex w-full items-center justify-between gap-3 rounded-card border px-3 py-2 text-left transition-colors ${
                      ativa
                        ? 'border-gold/50 bg-gold/10'
                        : 'border-edge/60 bg-card-2 hover:border-edge-strong'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-12 font-medium text-ink">{d.rotulo}</span>
                        {d.temRuptura && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger"
                            aria-label="tem oportunidade que rompe o abastecimento interno"
                          />
                        )}
                      </span>
                      <span className="tnums block font-mono text-11 text-ink-subtle">
                        {d.oportunidades} oportunidade{d.oportunidades === 1 ? '' : 's'} ·{' '}
                        {d.volumeT > 0 ? `${formatTon(d.volumeT)} vendáveis` : 'nenhuma aprovada'}
                      </span>
                    </span>
                    <span className="tnums shrink-0 text-right font-mono">
                      <span
                        className={`block text-12 font-semibold ${d.melhorMargemRsT < 0 ? 'text-danger' : 'text-ink'}`}
                      >
                        {formatBRL(d.melhorMargemRsT, { casas: 0 })}/t
                      </span>
                      <span className="block text-11 text-ink-subtle">
                        {formatBRL(d.margemRs, { compacto: true })}/mês
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
        </ul>
      </div>

      <p className="mt-3 text-11 leading-relaxed text-ink-subtle">
        Esquema geográfico, não mapa cartográfico: a intensidade do dourado é a melhor margem
        unitária da região, rosa marca margem negativa, e o tamanho do bloco não significa nada. O
        ponto rosa no canto sinaliza região com oportunidade que só é atendida rompendo o
        abastecimento das fábricas.
      </p>
    </div>
  )
}
