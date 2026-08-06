/**
 * ALERTA NO LUGAR DA DECISÃO — a faixa contextual de cada tela.
 *
 * A regra que governa este componente: é o ALERTA que declara onde aparece
 * (`telasRelacionadas`, `entidade`), não a tela que sai filtrando o catálogo.
 * Antes desta inversão, Hedge filtrava por categoria ('cambio' ou 'hedge') e
 * perdia justamente o alerta de câmbio que vira a decisão de moagem; a Compra
 * filtrava por texto do título. Cada tela tinha a sua regra, e nenhuma
 * envelhecia junto com o catálogo.
 *
 * Não poluir é parte do contrato: no máximo `limite` faixas por tela (padrão
 * 2), as mais urgentes, e o resto vira uma linha "+N na Central". Uma tela com
 * seis faixas não avisa nada — ela empurra o conteúdo para baixo e ensina a
 * ignorar a cor.
 */
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { marcarVisto } from './alertStore'
import { formatBRL } from '../data/format'
import type { Alerta } from '../data/types'
import { useAlertas } from './alertStore'
import { abrirCentral } from './centralStore'
import { abrirDetalheAlerta } from './AlertDetail'
import { paraEntidade, paraTela } from './selectors'
import { SEVERIDADE_UI } from './severidade'

export interface AlertaContextualProps {
  /** Rota da tela (usa `telasRelacionadas` do alerta). */
  rota?: string
  /** Id do objeto do domínio (usa `entidade` do alerta) — moinho, navio, lote. */
  entidadeId?: string
  /** Quantos mostrar antes de mandar o resto para a Central. */
  limite?: number
  className?: string
}

/**
 * Adiado e reconhecido saem da faixa: já tiveram uma decisão ("espero",
 * "assumo"). Continuam ativos na aba — some o aviso, não o fato. Resolvido já
 * sai antes, no `ativos()` de dentro dos seletores.
 */
const exibivel = (a: Alerta) => a.status !== 'adiado' && a.status !== 'reconhecido'

const VAZIO: readonly Alerta[] = []

function useAlertasContextuais({ rota, entidadeId }: AlertaContextualProps): readonly Alerta[] {
  // Os seletores devolvem referência memoizada; o filtro roda no corpo do
  // componente, fora do `useSyncExternalStore` — array novo aqui é inofensivo,
  // dentro do seletor seria laço infinito (React #185).
  const porRota = useAlertas((lista) => (rota ? paraTela(lista, rota) : VAZIO))
  const porEntidade = useAlertas((lista) => (entidadeId ? paraEntidade(lista, entidadeId) : VAZIO))
  if (rota && entidadeId) {
    const ids = new Set(porEntidade.map((a) => a.id))
    return [...porEntidade, ...porRota.filter((a) => !ids.has(a.id))].filter(exibivel)
  }
  return (rota ? porRota : porEntidade).filter(exibivel)
}

function LinkCentral({ quantos }: { quantos: number }) {
  return (
    <button
      type="button"
      onClick={abrirCentral}
      className="text-11 font-semibold text-ink-subtle transition-colors hover:text-gold"
    >
      +{quantos} na Central
    </button>
  )
}

/**
 * FAIXA — a posição padrão é logo abaixo do título da tela, em todas as telas,
 * para que o olho aprenda um lugar só.
 */
export function AlertBanner({ rota, entidadeId, limite = 2, className = '' }: AlertaContextualProps) {
  const todos = useAlertasContextuais({ rota, entidadeId })
  const navigate = useNavigate()
  if (todos.length === 0) return null
  const visiveis = todos.slice(0, limite)
  const restantes = todos.length - visiveis.length

  return (
    <div className={`space-y-1.5 ${className}`}>
      {visiveis.map((alerta) => {
        const ui = SEVERIDADE_UI[alerta.severidade]
        const Icone = ui.icone
        const positivo = alerta.tipo === 'oportunidade'
        return (
          <div
            key={alerta.id}
            className={`flex items-center gap-3 rounded-card border border-edge/60 border-l-2 ${ui.fio} ${ui.fundo} px-3 py-2`}
          >
            <Icone size={14} className={`shrink-0 ${ui.texto}`} aria-hidden="true" />
            {/* O título abre o DETALHE (sem sair da tela); o CTA executa a ação. */}
            <button
              type="button"
              onClick={() => abrirDetalheAlerta(alerta.id)}
              className="min-w-0 flex-1 truncate text-left text-12 font-medium text-ink transition-colors hover:text-gold-light"
              title={alerta.descricao}
            >
              {alerta.titulo}
            </button>
            {alerta.impactoRs != null && (
              <span
                className={`tnums hidden shrink-0 font-mono text-12 font-semibold sm:inline ${
                  positivo ? 'text-positive' : 'text-danger'
                }`}
              >
                {positivo ? '+' : '−'}
                {formatBRL(alerta.impactoRs, { compacto: true })}
              </span>
            )}
            {/* O CTA faz o que o rótulo promete — vai para onde a ação
                acontece. Abrir o detalhe também aqui seria prometer "ver
                impacto no TLC" e entregar outra coisa. */}
            <button
              type="button"
              onClick={() => {
                marcarVisto(alerta.id)
                navigate(alerta.acaoRota)
              }}
              className={`flex shrink-0 items-center gap-0.5 rounded-full border border-edge px-2.5 py-1 text-11 font-semibold transition-colors ${ui.texto} hover:border-gold/40`}
            >
              {alerta.acaoLabel}
              <ChevronRight size={11} aria-hidden="true" />
            </button>
          </div>
        )
      })}
      {restantes > 0 && (
        <div className="flex justify-end pr-1">
          <LinkCentral quantos={restantes} />
        </div>
      )}
    </div>
  )
}

/**
 * CHIP — a mesma informação em uma linha, para caber no cabeçalho de um painel
 * (ao lado do nome do moinho, do lote, da oportunidade). Aqui o padrão é UM
 * alerta: o cabeçalho é do painel, não do alerta.
 */
export function AlertChip({ rota, entidadeId, limite = 1, className = '' }: AlertaContextualProps) {
  const todos = useAlertasContextuais({ rota, entidadeId })
  if (todos.length === 0) return null
  const visiveis = todos.slice(0, limite)
  const restantes = todos.length - visiveis.length

  return (
    <span className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {visiveis.map((alerta) => {
        const ui = SEVERIDADE_UI[alerta.severidade]
        return (
          <button
            key={alerta.id}
            type="button"
            onClick={() => abrirDetalheAlerta(alerta.id)}
            title={alerta.titulo}
            className={`flex max-w-[16rem] items-center gap-1.5 rounded-full border border-edge/60 ${ui.fundo} px-2.5 py-1 transition-colors hover:border-gold/40`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ui.ponto}`} aria-hidden="true" />
            <span className="truncate text-11 font-medium text-ink-muted">{alerta.titulo}</span>
          </button>
        )
      })}
      {restantes > 0 && <LinkCentral quantos={restantes} />}
    </span>
  )
}
