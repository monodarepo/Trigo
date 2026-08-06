import { colors } from '../../theme/tokens'
import { formatBRL, formatTon } from '../../data/format'
import { REGIOES_MAPA } from '../../data/mapaBrasil'
import type { RegiaoComercial } from '../../data/types'

/**
 * Mapa operacional das regiões comerciais sobre o CONTORNO OFICIAL do Brasil
 * (malha do IBGE, via @svg-maps/brazil — CC BY 4.0). Cada estado é desenhado
 * separadamente e pintado pela cor da sua região: as divisas internas aparecem
 * e a leitura fica cartográfica de verdade, sem que a cor deixe de ser por
 * região — que é a unidade em que a decisão comercial acontece.
 *
 * A intensidade do dourado é a MELHOR MARGEM UNITÁRIA da região; a área de cada
 * região é geografia e não codifica nada, então nenhuma leitura de tamanho é
 * sugerida. Exportação não é uma região do país — é um destino —, então fica
 * fora do continente, do outro lado da linha d'água.
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

/**
 * O viewBox do Brasil é 613×639; estendemos a largura para abrir o oceano à
 * direita, onde mora o bloco de exportação. As coordenadas do país seguem
 * intactas — o mapa não é reescalado para caber o destino externo.
 */
const LARGURA_TOTAL = 790
const ALTURA = 639
const EXPORTACAO = { x: 646, y: 250, largura: 128, altura: 150 }

/** Onde cai o rótulo de cada região — centro visual vindo do gerador. */
const CENTROS = new Map(REGIOES_MAPA.map((r) => [r.id, r.centro]))

/**
 * Ajustes finos de rótulo, em unidades do viewBox. O centro ponderado pela área
 * é bom para achar a região, mas em duas delas ele cai onde o texto encavala:
 * no Nordeste, perto demais do litoral; no Sudeste, sobre a divisa com o Sul.
 */
const AJUSTE_ROTULO: Partial<Record<RegiaoComercial, { dx: number; dy: number }>> = {
  nordeste: { dx: -18, dy: -6 },
  sudeste: { dx: 4, dy: -10 },
  sul: { dx: -6, dy: 6 },
}

export function OpsMap({ dados, selecionada, onSelecionar, ariaLabel }: OpsMapProps) {
  const porRegiao = new Map(dados.map((d) => [d.regiao, d]))
  const maiorMargem = Math.max(1, ...dados.map((d) => d.melhorMargemRsT))
  const exportacao = porRegiao.get('exportacao')

  /** Cor e opacidade de uma região — a mesma sintaxe do resto do produto. */
  const pintura = (d: RegiaoMapa | undefined) => {
    const semDados = !d || d.oportunidades === 0
    // Cor como sintaxe: dourado = valor, rosa = destruição de valor. Pintar
    // margem negativa de dourado claro sugeriria oportunidade onde há perda.
    const negativa = !semDados && d.melhorMargemRsT < 0
    return {
      semDados,
      negativa,
      cor: semDados ? colors.surface.s3 : negativa ? colors.semantic.danger : colors.gold.primary,
      opacidade: semDados
        ? 0.35
        : negativa
          ? 0.55
          : Math.max(0.22, Math.min(1, d.melhorMargemRsT / maiorMargem)),
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <svg
          viewBox={`0 0 ${LARGURA_TOTAL} ${ALTURA}`}
          className="h-auto w-full shrink-0 lg:max-w-[640px]"
          role="img"
          aria-label={ariaLabel}
        >
          {/* Linha d'água: separa o continente do destino de exportação. */}
          <line
            x1={624}
            y1={40}
            x2={624}
            y2={ALTURA - 40}
            stroke={colors.navy.border}
            strokeDasharray="6 10"
          />

          {REGIOES_MAPA.map((regiaoMapa) => {
            const regiao = regiaoMapa.id as RegiaoComercial
            const d = porRegiao.get(regiao)
            const ativa = selecionada === regiao
            const { semDados, negativa, cor, opacidade } = pintura(d)
            const clicavel = Boolean(onSelecionar) && !semDados
            const centro = CENTROS.get(regiaoMapa.id)!
            const ajuste = AJUSTE_ROTULO[regiao] ?? { dx: 0, dy: 0 }
            const cx = centro.x + ajuste.dx
            const cy = centro.y + ajuste.dy

            return (
              <g
                key={regiao}
                onClick={clicavel ? () => onSelecionar?.(ativa ? null : regiao) : undefined}
                style={{ cursor: clicavel ? 'pointer' : 'default' }}
              >
                {/* Um path por estado: as divisas internas aparecem, mas a cor
                    continua sendo a da região — a unidade da decisão. */}
                {regiaoMapa.estados.map((estado) => (
                  <path
                    key={estado.uf}
                    d={estado.d}
                    fill={cor}
                    fillOpacity={ativa ? Math.min(1, opacidade + 0.2) : opacidade}
                    stroke={ativa ? colors.gold.light : colors.surface.base}
                    strokeWidth={ativa ? 1.6 : 1}
                    strokeLinejoin="round"
                  >
                    <title>
                      {estado.nome} · {regiaoMapa.rotulo}
                      {d ? ` · ${formatBRL(d.melhorMargemRsT, { casas: 0 })}/t` : ''}
                    </title>
                  </path>
                ))}

                {/* Acima e à direita do rótulo, longe o bastante para não
                    encostar na primeira linha do texto em nenhuma região. */}
                {d?.temRuptura && (
                  <circle
                    cx={cx + 58}
                    cy={cy - 42}
                    r={9}
                    fill={colors.semantic.danger}
                    stroke={colors.surface.base}
                    strokeWidth={2.5}
                  />
                )}

                {/* Rótulo com contorno escuro: o mapa tem fundo claro e escuro
                    sob o mesmo texto, e sem o traço o nome some sobre o dourado. */}
                <text
                  x={cx}
                  y={cy - 4}
                  textAnchor="middle"
                  fontSize={23}
                  fontWeight={ativa ? 700 : 600}
                  fill={ativa ? colors.gold.light : colors.text.strong}
                  stroke={colors.surface.base}
                  strokeWidth={4}
                  paintOrder="stroke"
                  style={{ pointerEvents: 'none' }}
                >
                  {d?.rotulo ?? regiaoMapa.rotulo}
                </text>
                <text
                  x={cx}
                  y={cy + 22}
                  textAnchor="middle"
                  fontSize={22}
                  fill={semDados ? colors.text.faint : negativa ? colors.semantic.danger : colors.text.strong}
                  stroke={colors.surface.base}
                  strokeWidth={4}
                  paintOrder="stroke"
                  style={{ fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}
                >
                  {semDados || !d ? '—' : `${formatBRL(d.melhorMargemRsT, { casas: 0 })}/t`}
                </text>
              </g>
            )
          })}

          {/* Exportação: destino, não região — fica no oceano, do outro lado. */}
          {(() => {
            const { semDados, negativa, cor, opacidade } = pintura(exportacao)
            const clicavel = Boolean(onSelecionar) && !semDados
            const ativa = selecionada === 'exportacao'
            const cx = EXPORTACAO.x + EXPORTACAO.largura / 2
            const cy = EXPORTACAO.y + EXPORTACAO.altura / 2
            return (
              <g
                onClick={clicavel ? () => onSelecionar?.(ativa ? null : 'exportacao') : undefined}
                style={{ cursor: clicavel ? 'pointer' : 'default' }}
              >
                <text x={cx} y={EXPORTACAO.y - 16} textAnchor="middle" fontSize={19} fill={colors.text.faint}>
                  fora do país
                </text>
                <rect
                  x={EXPORTACAO.x}
                  y={EXPORTACAO.y}
                  width={EXPORTACAO.largura}
                  height={EXPORTACAO.altura}
                  rx={16}
                  fill={cor}
                  fillOpacity={ativa ? Math.min(1, opacidade + 0.2) : opacidade}
                  stroke={ativa ? colors.gold.light : colors.navy.border}
                  strokeWidth={ativa ? 2.5 : 1.5}
                  strokeDasharray={ativa ? undefined : '7 5'}
                />
                {exportacao?.temRuptura && (
                  <circle
                    cx={EXPORTACAO.x + EXPORTACAO.largura - 12}
                    cy={EXPORTACAO.y + 12}
                    r={9}
                    fill={colors.semantic.danger}
                    stroke={colors.surface.base}
                    strokeWidth={2.5}
                  />
                )}
                <text
                  x={cx}
                  y={cy - 4}
                  textAnchor="middle"
                  fontSize={23}
                  fontWeight={ativa ? 700 : 600}
                  fill={ativa ? colors.gold.light : colors.text.strong}
                  style={{ pointerEvents: 'none' }}
                >
                  {exportacao?.rotulo ?? 'Exportação'}
                </text>
                <text
                  x={cx}
                  y={cy + 22}
                  textAnchor="middle"
                  fontSize={22}
                  fill={semDados ? colors.text.faint : negativa ? colors.semantic.danger : colors.text.strong}
                  style={{ fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}
                >
                  {semDados || !exportacao ? '—' : `${formatBRL(exportacao.melhorMargemRsT, { casas: 0 })}/t`}
                </text>
              </g>
            )
          })()}
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
        Contorno oficial do Brasil (malha do IBGE). A intensidade do dourado é a melhor margem
        unitária da região e rosa marca margem negativa — a área de cada região é geografia e não
        significa nada. O ponto rosa sinaliza região com oportunidade que só é atendida rompendo o
        abastecimento das fábricas. Exportação fica fora do continente porque é um destino, não uma
        região do país.
      </p>
    </div>
  )
}
