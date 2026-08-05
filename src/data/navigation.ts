import {
  BellRing,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  path: string
  /** Label curto exibido na sidebar. */
  label: string
  /** Título completo da tela, exibido na Topbar. */
  title: string
  icon: LucideIcon
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Sinais & Previsão',
    items: [
      { path: '/', label: 'Cockpit', title: 'Cockpit Executivo', icon: LayoutDashboard },
      { path: '/previsao', label: 'Previsão', title: 'Previsão de Preço e Câmbio', icon: TrendingUp },
    ],
  },
  {
    label: 'Decisão',
    items: [
      { path: '/tlc', label: 'Total Landed Cost', title: 'Total Landed Cost', icon: Layers },
      { path: '/compra', label: 'Compra', title: 'Recomendação de Compra', icon: ShoppingCart },
      { path: '/hedge', label: 'Hedge', title: 'Recomendação de Hedge', icon: ShieldCheck },
      { path: '/simulador', label: 'Simulador', title: 'Simulador de Cenários', icon: SlidersHorizontal },
    ],
  },
  {
    label: 'Operação',
    items: [
      { path: '/alertas', label: 'Alertas', title: 'Alertas Diários', icon: BellRing },
      { path: '/copiloto', label: 'Copiloto Gemini', title: 'Copiloto Gemini', icon: Sparkles },
    ],
  },
  {
    label: 'Governança',
    items: [
      { path: '/vro', label: 'Realização de Valor', title: 'VRO — Realização de Valor', icon: Trophy },
    ],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items)

export function findNavItem(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => item.path === pathname)
}
