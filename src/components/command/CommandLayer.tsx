import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing, CheckCircle2, Download, Monitor, Play, Radio, Rows3, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { CommandPalette, type Comando } from './CommandPalette'
import { ShortcutsHelp } from './ShortcutsHelp'
import { useHotkeys } from '../../hooks/useHotkeys'
import { emitirToast } from '../feedback/toastBus'
import { ApprovalModal } from '../approval/ApprovalModal'
import { aoAbrirAprovacao } from '../approval/approvalBus'
import type { ModoDecisao } from '../approval/decisionStore'
import { abrirApresentacao, useApresentacaoAtiva } from '../present/presentStore'
import { alternarDensidade, alternarMural } from '../layout/layoutStore'
import { alternarDataMode } from '../../live/dataMode'
import { ALL_NAV_ITEMS } from '../../data/navigation'
import { snapshot } from '../../data'

const EVENTO_PALETTE = 'torre:abrir-palette'

/** Abre o command palette de qualquer lugar (ex.: botão da Topbar). */
export function abrirCommandPalette() {
  window.dispatchEvent(new Event(EVENTO_PALETTE))
}

/** Letra da sequência "g + letra" por rota, na ordem das telas do menu. */
const LETRAS_SEQUENCIA = ['c', 'p', 't', 'b', 'h', 's', 'a', 'i', 'l', 'v'] as const

export function CommandLayer() {
  const navigate = useNavigate()
  const [paletteAberto, setPaletteAberto] = useState(false)
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const [aprovacao, setAprovacao] = useState<{ aberta: boolean; modo?: ModoDecisao }>({ aberta: false })
  const apresentando = useApresentacaoAtiva()

  useEffect(() => {
    const abre = () => setPaletteAberto(true)
    window.addEventListener(EVENTO_PALETTE, abre)
    const desligaAprovacao = aoAbrirAprovacao((modo) => setAprovacao({ aberta: true, modo }))
    return () => {
      window.removeEventListener(EVENTO_PALETTE, abre)
      desligaAprovacao()
    }
  }, [])

  const sequencias = Object.fromEntries(
    ALL_NAV_ITEMS.map((item, i) => [LETRAS_SEQUENCIA[i], () => navigate(item.path)]),
  )

  useHotkeys({
    // ⌘K fica fora do "suspenso" (fecha o próprio palette) — mas não abre por cima da apresentação
    onPalette: () => setPaletteAberto((a) => (apresentando ? a : !a)),
    onAjuda: () => setAjudaAberta(true),
    onAprovar: () => setAprovacao({ aberta: true }),
    onApresentar: abrirApresentacao,
    sequencias,
    suspenso: paletteAberto || ajudaAberta || aprovacao.aberta || apresentando,
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
      executar: () => setAprovacao({ aberta: true }),
    },
    {
      id: 'acao-apresentar',
      grupo: 'Ações',
      rotulo: 'Iniciar modo apresentação',
      icone: Play,
      atalho: 'P',
      executar: () => abrirApresentacao(),
    },
    {
      id: 'acao-densidade',
      grupo: 'Ações',
      rotulo: 'Alternar densidade (compacta/confortável)',
      icone: Rows3,
      executar: () => alternarDensidade(),
    },
    {
      id: 'acao-datamode',
      grupo: 'Ações',
      rotulo: 'Alternar dados externos (Ao vivo/Cenário)',
      icone: Radio,
      executar: () => alternarDataMode(),
    },
    {
      id: 'acao-mural',
      grupo: 'Ações',
      rotulo: 'Modo mural (telão)',
      icone: Monitor,
      executar: () => alternarMural(),
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
      rotulo: 'Exportar recomendação (one-pager)',
      icone: Download,
      executar: () => {
        navigate('/exportar')
        emitirToast({ tom: 'info', titulo: 'One-pager pronto', descricao: 'Use “Imprimir / salvar PDF” para anexar ao fluxo de aprovação.' })
      },
    },
    ...snapshot.copiloto.chips.map((pergunta, i) => ({
      id: `ia-${i}`,
      grupo: 'Perguntar à IA' as const,
      rotulo: pergunta,
      icone: ALL_NAV_ITEMS[7].icon,
      executar: () => navigate(`/copiloto?q=${encodeURIComponent(pergunta)}`),
    })),
  ]

  return (
    <>
      <CommandPalette
        aberto={paletteAberto}
        comandos={comandos}
        aoPerguntar={(pergunta) => navigate(`/copiloto?q=${encodeURIComponent(pergunta)}`)}
        aoFechar={() => setPaletteAberto(false)}
      />
      <ShortcutsHelp aberto={ajudaAberta} aoFechar={() => setAjudaAberta(false)} />

      {/* Fluxo de aprovação (tecla A / palette / botões das telas via bus) */}
      <ApprovalModal
        aberto={aprovacao.aberta}
        modoInicial={aprovacao.modo}
        aoFechar={() => setAprovacao({ aberta: false })}
      />
    </>
  )
}
