import {
  Beaker,
  BellRing,
  CalendarRange,
  Factory,
  Handshake,
  Layers,
  LayoutDashboard,
  RadioTower,
  Scale,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Trophy,
  Warehouse,
  Workflow,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  path: string
  /** Label curto exibido na sidebar. */
  label: string
  /** Título completo da tela, exibido na Topbar. */
  title: string
  icon: LucideIcon
  /** Letra da sequência "g + letra" (atalho de navegação). Única em todo o menu. */
  atalho?: string
}

export interface NavSection {
  label: string
  items: NavItem[]
}

/**
 * Arquitetura de informação por ELO DA CADEIA (trigo → farinha → margem):
 * Visão · Mercado & Sinais · Trigo · Moinhos & Farinha · Margem & Decisão · Governança.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Visão',
    items: [
      { path: '/', label: 'Visão Executiva', title: 'Visão Executiva', icon: LayoutDashboard, atalho: 'v' },
    ],
  },
  {
    label: 'Mercado & Sinais',
    items: [
      { path: '/previsao', label: 'Mercado', title: 'Mercado de Trigo e Farinha', icon: TrendingUp, atalho: 'p' },
      { path: '/sinais', label: 'Sinais ao Vivo', title: 'Sinais ao Vivo — Observabilidade', icon: RadioTower, atalho: 'i' },
    ],
  },
  {
    label: 'Trigo',
    items: [
      { path: '/tlc', label: 'Total Landed Cost', title: 'Total Landed Cost', icon: Layers, atalho: 't' },
      { path: '/compra', label: 'Compra', title: 'Recomendação de Compra', icon: ShoppingCart, atalho: 'b' },
      { path: '/hedge', label: 'Hedge', title: 'Hedge', icon: ShieldCheck, atalho: 'h' },
      { path: '/estoques', label: 'Estoques & Blends', title: 'Estoques & Blends', icon: Warehouse, atalho: 'e' },
    ],
  },
  {
    label: 'Moinhos & Farinha',
    items: [
      { path: '/moinhos', label: 'Moinhos', title: 'Performance dos Moinhos', icon: Factory, atalho: 'm' },
      { path: '/verticalizacao', label: 'Verticalização', title: 'Rentabilidade da Verticalização', icon: Workflow, atalho: 'z' },
      { path: '/demanda', label: 'Demanda', title: 'Planejamento da Demanda', icon: CalendarRange, atalho: 'd' },
    ],
  },
  {
    label: 'Margem & Decisão',
    items: [
      { path: '/make-buy-sell', label: 'Make/Buy/Sell', title: 'Simulador Make/Buy/Sell', icon: Scale, atalho: 'k' },
      { path: '/oportunidades', label: 'Oportunidades', title: 'Oportunidades Comerciais', icon: Handshake, atalho: 'o' },
      { path: '/simulador', label: 'Simulador', title: 'Simulador de Cenários', icon: SlidersHorizontal, atalho: 's' },
      { path: '/alertas', label: 'Alertas', title: 'Alertas & Decisões', icon: BellRing, atalho: 'a' },
    ],
  },
  {
    label: 'Governança',
    items: [
      { path: '/copiloto', label: 'Copiloto', title: 'Copiloto Executivo', icon: Sparkles, atalho: 'c' },
      { path: '/vro', label: 'Realização de Valor', title: 'VRO — Realização de Valor', icon: Trophy, atalho: 'r' },
      /* O POC fica em Governança, e não num elo da cadeia, porque não é mais uma
         tela de decisão: é a prova retrospectiva de que as decisões das outras
         valem dinheiro. Mora ao lado do VRO, que mede a mesma coisa daqui para
         a frente. */
      { path: '/poc', label: 'Modo POC', title: 'Modo POC — piloto de 90 dias', icon: Beaker, atalho: 'q' },
    ],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items)

export function findNavItem(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => item.path === pathname)
}
