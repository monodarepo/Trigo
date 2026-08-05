import { AnimatePresence, motion } from 'framer-motion'
import { Sparkline } from '../ui'
import { AnimatedNumber } from './AnimatedNumber'
import { LIVE_BASE, useLive } from '../../live/liveStore'
import { definirDataMode, useDataMode, type DataMode } from '../../live/dataMode'
import { useFxAoVivo, useFxSerieAoVivo, useWheatAoVivo } from '../../live/useLiveData'

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

/**
 * Câmbio do pulse: PERIFERIA ao vivo (Frankfurter) quando o modo permite —
 * valor real, delta vs fechamento anterior e sparkline da série (~30d).
 * Em Cenário/falha, volta à flutuação encenada em torno de R$ 5,20.
 */
function CotacaoCambio() {
  const precos = useLive((s) => s.precos)
  const historico = useLive((s) => s.historico)
  const fx = useFxAoVivo()
  const serie = useFxSerieAoVivo()

  if (!fx.isLive) {
    return <Cotacao rotulo="Câmbio" valor={precos.cambio} base={LIVE_BASE.cambio} casas={3} prefixo="R$" serie={historico.cambio} />
  }

  const taxas = serie.value.map((p) => p.taxa)
  const ultima = serie.value[serie.value.length - 1]
  // Fechamento anterior: se a série já inclui a data de hoje, usa a penúltima
  const fechamentoAnterior =
    serie.isLive && serie.value.length > 1
      ? ultima.data === fx.value.data
        ? serie.value[serie.value.length - 2].taxa
        : ultima.taxa
      : fx.value.taxa
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <Cotacao rotulo="Câmbio" valor={fx.value.taxa} base={fechamentoAnterior} casas={3} prefixo="R$" serie={taxas} />
      <span className="rounded-full border border-positive/40 bg-positive/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-positive">
        ao vivo
      </span>
    </span>
  )
}

/**
 * Trigo do pulse com ÂNCORA-E-DERIVA sobre a referência mensal (/api/wheat):
 * a âncora é o preço mensal (FRED via Alpha Vantage) e a micro-flutuação do
 * PRO-1 (±0,1–0,3%) oscila EM TORNO dela — é uma leitura sobre a referência,
 * não cotação intraday (chip âmbar "ref. mensal", nunca "ao vivo").
 * Sem referência (Cenário/falha), oscila sobre o CBOT encenado (US$ 205).
 */
function CotacaoTrigo() {
  const precos = useLive((s) => s.precos)
  const historico = useLive((s) => s.historico)
  const wheat = useWheatAoVivo()

  if (!wheat.isLive) {
    return (
      <Cotacao rotulo="Trigo CBOT" valor={precos.trigoUsdT} base={LIVE_BASE.trigoUsdT} casas={1} prefixo="US$" sufixo="/t" serie={historico.trigo} />
    )
  }

  const ancora = wheat.value.precoUsdT
  const escala = (v: number) => (v / LIVE_BASE.trigoUsdT) * ancora
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <Cotacao
        rotulo="Trigo"
        valor={escala(precos.trigoUsdT)}
        base={ancora}
        casas={1}
        prefixo="US$"
        sufixo="/t"
        serie={historico.trigo.map(escala)}
      />
      <span
        className="rounded-full border border-warning/40 bg-warning/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-warning"
        title="Âncora: preço global mensal (FRED via Alpha Vantage) — o pulso oscila ±0,3% sobre a referência; não é cotação intraday CBOT"
      >
        ref. mensal
      </span>
    </span>
  )
}

/** Faixa fina de mercado ao vivo (Topbar): trigo, câmbio e frete oscilando. */
export function MarketPulse() {
  const precos = useLive((s) => s.precos)
  const historico = useLive((s) => s.historico)
  const eventos = useLive((s) => s.eventos)
  const modo = useDataMode()
  const ultimoEvento = eventos[eventos.length - 1]

  return (
    <div className="flex items-center gap-4 overflow-x-auto border-t border-edge/40 px-4 py-1.5 lg:gap-5 lg:px-8 [scrollbar-width:none]">
      <span
        className="flex shrink-0 items-center gap-1.5"
        aria-label={
          modo === 'aovivo'
            ? 'Sinais de mercado — câmbio ao vivo, trigo sobre referência mensal, frete simulado'
            : 'Sinais de mercado do cenário (simulação)'
        }
      >
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
        </span>
        <span className="font-mono text-11 font-semibold tracking-[0.2em] text-positive">LIVE</span>
      </span>

      <CotacaoTrigo />
      <CotacaoCambio />
      <span className="shrink-0" title="Frete simulado sobre o cenário — sem fonte externa nesta demo">
        <Cotacao
          rotulo="Frete"
          valor={precos.freteUsdT}
          base={LIVE_BASE.freteUsdT}
          casas={2}
          prefixo="US$"
          sufixo="/t"
          serie={historico.frete}
        />
      </span>

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
