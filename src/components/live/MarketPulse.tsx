import { AnimatePresence, motion } from 'framer-motion'
import { Sparkline } from '../ui'
import { AnimatedNumber } from './AnimatedNumber'
import { LIVE_BASE, useLive } from '../../live/liveStore'
import { definirDataMode, useDataMode, type DataMode } from '../../live/dataMode'

/** Toggle "Ao vivo | Cenário": em Cenário, todos os useLiveData ignoram a rede. */
function ToggleModoDados() {
  const modo = useDataMode()
  const opcao = (id: DataMode, rotulo: string) => (
    <button
      type="button"
      aria-pressed={modo === id}
      onClick={() => definirDataMode(id)}
      className={`rounded-full px-2 py-0.5 text-11 font-semibold transition-colors ${
        modo === id ? 'bg-gold text-navy' : 'text-ink-subtle hover:text-ink'
      }`}
    >
      {rotulo}
    </button>
  )
  return (
    <span
      role="group"
      aria-label="Fonte de dados externos"
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-edge bg-card-2 p-0.5"
    >
      {opcao('aovivo', 'Ao vivo')}
      {opcao('cenario', 'Cenário')}
    </span>
  )
}

const fmt = (v: number, casas: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

function Cotacao({
  rotulo,
  valor,
  base,
  casas,
  prefixo,
  sufixo,
  serie,
}: {
  rotulo: string
  valor: number
  base: number
  casas: number
  prefixo: string
  sufixo?: string
  serie: readonly number[]
}) {
  const deltaPct = (valor / base - 1) * 100
  const estavel = Math.abs(deltaPct) < 0.005
  // Cor-sintaxe do produto: alta de custo pressiona (rosa), queda alivia (esmeralda)
  const cor = estavel ? 'text-ink-faint' : deltaPct > 0 ? 'text-danger' : 'text-positive'
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="text-11 font-medium uppercase tracking-wide text-ink-faint">{rotulo}</span>
      <span className="font-mono text-12 font-semibold text-ink">
        {prefixo}{' '}
        <AnimatedNumber valor={valor} formatar={(v) => fmt(v, casas)} />
        {sufixo}
      </span>
      <span className={`tnums font-mono text-11 ${cor}`}>
        {estavel ? '0,00%' : `${deltaPct > 0 ? '+' : '−'}${fmt(Math.abs(deltaPct), 2)}%`}
      </span>
      <span className="hidden sm:block">
        <Sparkline data={serie} width={52} height={14} strokeWidth={1.5} tone={deltaPct > 0 ? 'danger' : 'positive'} />
      </span>
    </span>
  )
}

/** Faixa fina de mercado ao vivo (Topbar): trigo, câmbio e frete oscilando. */
export function MarketPulse() {
  const precos = useLive((s) => s.precos)
  const historico = useLive((s) => s.historico)
  const eventos = useLive((s) => s.eventos)
  const ultimoEvento = eventos[eventos.length - 1]

  return (
    <div className="flex items-center gap-4 overflow-x-auto border-t border-edge/40 px-4 py-1.5 lg:gap-5 lg:px-8 [scrollbar-width:none]">
      <span className="flex shrink-0 items-center gap-1.5" aria-label="Sinais de mercado ao vivo (simulação)">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
        </span>
        <span className="font-mono text-11 font-semibold tracking-[0.2em] text-positive">LIVE</span>
      </span>

      <Cotacao
        rotulo="Trigo CBOT"
        valor={precos.trigoUsdT}
        base={LIVE_BASE.trigoUsdT}
        casas={1}
        prefixo="US$"
        sufixo="/t"
        serie={historico.trigo}
      />
      <Cotacao rotulo="Câmbio" valor={precos.cambio} base={LIVE_BASE.cambio} casas={3} prefixo="R$" serie={historico.cambio} />
      <Cotacao
        rotulo="Frete"
        valor={precos.freteUsdT}
        base={LIVE_BASE.freteUsdT}
        casas={2}
        prefixo="US$"
        sufixo="/t"
        serie={historico.frete}
      />

      <span className="ml-auto hidden min-w-0 shrink items-center md:flex">
        <AnimatePresence mode="wait">
          <motion.span
            key={ultimoEvento.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="truncate font-mono text-11 text-ink-faint"
          >
            {ultimoEvento.texto}
          </motion.span>
        </AnimatePresence>
      </span>

      <ToggleModoDados />
    </div>
  )
}
