import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BellRing, CheckCircle2, Download, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { CommandPalette, type Comando } from './CommandPalette'
import { ShortcutsHelp } from './ShortcutsHelp'
import { useHotkeys } from '../../hooks/useHotkeys'
import { emitirToast } from '../feedback/toastBus'
import { ALL_NAV_ITEMS } from '../../data/navigation'
import { snapshot, formatBRL, formatPct } from '../../data'

const EVENTO_PALETTE = 'torre:abrir-palette'

/** Abre o command palette de qualquer lugar (ex.: botão da Topbar). */
export function abrirCommandPalette() {
  window.dispatchEvent(new Event(EVENTO_PALETTE))
}

/** Letra da sequência "g + letra" por rota, na ordem das telas do menu. */
const LETRAS_SEQUENCIA = ['c', 'p', 't', 'b', 'h', 's', 'a', 'i', 'v'] as const

export function CommandLayer() {
  const navigate = useNavigate()
  const [paletteAberto, setPaletteAberto] = useState(false)
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const [confirmaAprovacao, setConfirmaAprovacao] = useState(false)

  useEffect(() => {
    const abre = () => setPaletteAberto(true)
    window.addEventListener(EVENTO_PALETTE, abre)
    return () => window.removeEventListener(EVENTO_PALETTE, abre)
  }, [])

  const sequencias = Object.fromEntries(
    ALL_NAV_ITEMS.map((item, i) => [LETRAS_SEQUENCIA[i], () => navigate(item.path)]),
  )

  useHotkeys({
    onPalette: () => setPaletteAberto((a) => !a),
    onAjuda: () => setAjudaAberta(true),
    onAprovar: () => setConfirmaAprovacao(true),
    sequencias,
    suspenso: paletteAberto || ajudaAberta || confirmaAprovacao,
  })

  const comandos: Comando[] = [
    ...ALL_NAV_ITEMS.map((item, i) => ({
      id: `nav-${item.path}`,
      grupo: 'Navegar' as const,
      rotulo: item.title,
      icone: item.icon,
      atalho: `G ${LETRAS_SEQUENCIA[i].toUpperCase()}`,
      executar: () => navigate(item.path),
    })),
    {
      id: 'acao-aprovar',
      grupo: 'Ações',
      rotulo: 'Aprovar recomendação do dia',
      icone: CheckCircle2,
      atalho: 'A',
      executar: () => setConfirmaAprovacao(true),
    },
    {
      id: 'acao-simulador',
      grupo: 'Ações',
      rotulo: 'Abrir simulador',
      icone: SlidersHorizontal,
      executar: () => navigate('/simulador'),
    },
    {
      id: 'acao-alertas',
      grupo: 'Ações',
      rotulo: 'Ver alertas críticos',
      icone: BellRing,
      executar: () => navigate('/alertas'),
    },
    {
      id: 'acao-hedge',
      grupo: 'Ações',
      rotulo: 'Executar hedge recomendado',
      icone: ShieldCheck,
      executar: () => {
        navigate('/hedge')
        emitirToast({ tom: 'sucesso', titulo: 'Ordem de NDF encaminhada à Tesouraria — sujeita à aprovação humana' })
      },
    },
    {
      id: 'acao-exportar',
      grupo: 'Ações',
      rotulo: 'Exportar recomendação',
      icone: Download,
      executar: () =>
        emitirToast({ tom: 'sucesso', titulo: 'Recomendação do dia exportada', descricao: 'PDF simulado na demo — inclui racional e memória de cálculo.' }),
    },
    ...snapshot.copiloto.chips.map((pergunta, i) => ({
      id: `ia-${i}`,
      grupo: 'Perguntar à IA' as const,
      rotulo: pergunta,
      icone: ALL_NAV_ITEMS[7].icon,
      executar: () => navigate(`/copiloto?q=${encodeURIComponent(pergunta)}`),
    })),
  ]

  const rec = snapshot.recomendacaoDoDia

  return (
    <>
      <CommandPalette
        aberto={paletteAberto}
        comandos={comandos}
        aoPerguntar={(pergunta) => navigate(`/copiloto?q=${encodeURIComponent(pergunta)}`)}
        aoFechar={() => setPaletteAberto(false)}
      />
      <ShortcutsHelp aberto={ajudaAberta} aoFechar={() => setAjudaAberta(false)} />

      {/* Confirmação de aprovação (tecla A / palette) */}
      <AnimatePresence>
        {confirmaAprovacao && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => setConfirmaAprovacao(false)}
              aria-hidden="true"
            />
            <motion.div
              className="fixed inset-x-3 top-[24vh] z-[70] mx-auto max-w-sm"
              initial={{ opacity: 0, scale: 0.99, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: -6 }}
              transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
              role="alertdialog"
              aria-modal="true"
              aria-label="Confirmar aprovação da recomendação do dia"
              onKeyDown={(e) => e.key === 'Escape' && setConfirmaAprovacao(false)}
            >
              <div className="rounded-card-lg border border-gold/30 bg-card p-5 shadow-card-gold">
                <h3 className="font-display text-16 font-semibold text-ink">Aprovar recomendação do dia?</h3>
                <p className="tnums mt-2 text-13 leading-relaxed text-ink-muted">
                  Antecipar {formatPct(rec.compra.anteciparPctTrimestre)} do trimestre + proteger{' '}
                  {formatPct(rec.hedge.coberturaAlvoPct)} do câmbio — impacto protegido de{' '}
                  {formatBRL(rec.impactoProtegidoRs, { compacto: true })}.
                </p>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmaAprovacao(false)}
                    className="rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-edge-strong hover:text-ink"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => {
                      setConfirmaAprovacao(false)
                      emitirToast({ tom: 'sucesso', titulo: 'Recomendação aprovada — encaminhada para execução' })
                    }}
                    className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light"
                  >
                    Confirmar aprovação
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </>
  )
}
