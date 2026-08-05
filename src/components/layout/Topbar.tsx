import { useLocation } from 'react-router-dom'
import { ChevronDown, Menu, Play, Search } from 'lucide-react'
import { findNavItem } from '../../data/navigation'
import { APP_CONTEXT } from '../../data/appContext'
import { MarketPulse } from '../live/MarketPulse'
import { abrirCommandPalette } from '../command/CommandLayer'
import { NotificationCenter } from '../feedback/NotificationCenter'
import { abrirApresentacao } from '../present/presentStore'

interface TopbarProps {
  onOpenMenu: () => void
}

function ContextSelect({ label, options }: { label: string; options: readonly string[] }) {
  return (
    <label className="relative hidden items-center md:flex">
      <span className="sr-only">{label}</span>
      <select
        defaultValue={options[0]}
        className="appearance-none rounded-full border border-edge bg-card-2 py-1.5 pl-3 pr-8 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 text-ink-subtle"
        aria-hidden="true"
      />
    </label>
  )
}

export function Topbar({ onOpenMenu }: TopbarProps) {
  const { pathname } = useLocation()
  const title = findNavItem(pathname)?.title ?? 'Torre de Controle do Trigo'

  return (
    <header className="sticky top-0 z-30 border-b border-edge/60 bg-base/85 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-edge bg-card-2 text-ink-muted hover:text-ink lg:hidden"
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-semibold text-ink lg:text-xl">
            {title}
          </h1>
          <p className="tnums text-xs text-ink-subtle">{APP_CONTEXT.dateLabel}</p>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:gap-3">
          <button
            type="button"
            onClick={abrirCommandPalette}
            aria-label="Abrir busca e comandos (Ctrl+K)"
            className="hidden items-center gap-2 rounded-full border border-edge bg-card-2 px-3 py-1.5 text-xs text-ink-subtle transition-colors hover:border-edge-strong hover:text-ink md:flex"
          >
            <Search size={13} aria-hidden="true" />
            Buscar…
            <kbd className="rounded border border-edge bg-surface-1 px-1.5 py-0.5 font-mono text-11 text-ink-faint">
              ⌘K
            </kbd>
          </button>
          <ContextSelect label="Período" options={APP_CONTEXT.periodOptions} />
          <ContextSelect label="Moinho" options={APP_CONTEXT.millOptions} />

          <button
            type="button"
            onClick={abrirApresentacao}
            aria-label="Iniciar modo apresentação (tecla P)"
            className="hidden items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold-light transition-colors hover:bg-gold/20 lg:flex"
          >
            <Play size={12} aria-hidden="true" />
            Apresentar
          </button>

          <NotificationCenter />

          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-navy"
            aria-label={`Usuário: ${APP_CONTEXT.user.name}`}
          >
            {APP_CONTEXT.user.initials}
          </span>
        </div>
      </div>
      <MarketPulse />
    </header>
  )
}
