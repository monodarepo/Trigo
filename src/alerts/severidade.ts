/**
 * A SINTAXE VISUAL DA SEVERIDADE, em um lugar só.
 *
 * O sino, a Central, a faixa crítica e o toast precisam da mesma resposta para
 * "que cor tem um crítico?". Antes cada superfície carregava o seu mapa — e o
 * dia em que um deles ganhasse um tom novo, o alerta apareceria vermelho no
 * sino e âmbar no toast. Um mapa só, quatro leitores.
 */
import { AlertOctagon, AlertTriangle, Bell, Info, type LucideIcon } from 'lucide-react'
import type { SeveridadeAlerta } from '../data/types'
import type { Tone } from '../components/ui/tones'
import type { TomToast } from '../components/feedback/toastBus'

export interface AparenciaSeveridade {
  rotulo: string
  icone: LucideIcon
  /** Tom do design system — alimenta Badge/Pill. */
  tone: Tone
  /** Cor do texto/ícone. */
  texto: string
  /** Ponto sólido (sino, marcador de lista). */
  ponto: string
  /** Fio lateral do item na lista — o "realce" sem caixa pesada. */
  fio: string
  /** Fundo translúcido para faixas e destaques. */
  fundo: string
  /** Tom equivalente no bus de toasts. */
  tomToast: TomToast
}

export const SEVERIDADE_UI: Record<SeveridadeAlerta, AparenciaSeveridade> = {
  critico: {
    rotulo: 'Crítico',
    icone: AlertOctagon,
    tone: 'danger',
    texto: 'text-danger',
    ponto: 'bg-danger',
    fio: 'border-l-danger',
    fundo: 'bg-danger/10',
    /* 'erro' e não um tom próprio: no toast, crítico e erro são a mesma coisa
       — rosa e anúncio assertivo (role="alert"). Um tom a mais no bus só
       criaria duas maneiras de pintar o mesmo pixel. */
    tomToast: 'erro',
  },
  alto: {
    rotulo: 'Alto',
    icone: AlertTriangle,
    tone: 'warning',
    texto: 'text-warning',
    ponto: 'bg-warning',
    fio: 'border-l-warning',
    fundo: 'bg-warning/10',
    tomToast: 'aviso',
  },
  medio: {
    rotulo: 'Médio',
    icone: Bell,
    tone: 'info',
    texto: 'text-azure',
    ponto: 'bg-azure',
    fio: 'border-l-azure',
    fundo: 'bg-azure/10',
    tomToast: 'info',
  },
  informativo: {
    rotulo: 'Info',
    icone: Info,
    tone: 'neutral',
    texto: 'text-ink-subtle',
    ponto: 'bg-edge-strong',
    fio: 'border-l-edge-strong',
    fundo: 'bg-white/[0.04]',
    tomToast: 'neutro',
  },
}

/** Ordem de exibição dos contadores — a mesma da fila. */
export const SEVERIDADES: readonly SeveridadeAlerta[] = ['critico', 'alto', 'medio', 'informativo']
