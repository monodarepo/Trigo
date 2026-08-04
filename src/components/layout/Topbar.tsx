import { useLocation } from 'react-router-dom'
import { Bell, ChevronDown, Menu } from 'lucide-react'
import { findNavItem } from '../../data/navigation'
import { APP_CONTEXT } from '../../data/appContext'
import { snapshot } from '../../data'

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
    <header className="sticky top-0 z-30 border-b border-edge/60 bg-navy/85 backdrop-blur">
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
          <ContextSelect label="Período" options={APP_CONTEXT.periodOptions} />
          <ContextSelect label="Moinho" options={APP_CONTEXT.millOptions} />

          <button
            type="button"
            aria-label={`Alertas: ${snapshot.contagemAlertas} críticos ou altos`}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-edge bg-card-2 text-ink-muted hover:text-ink"
          >
            <Bell size={16} aria-hidden="true" />
            <span
              className="tnums absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-ink"
              aria-hidden="true"
            >
              {snapshot.contagemAlertas}
            </span>
          </button>

          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-navy"
            aria-label={`Usuário: ${APP_CONTEXT.user.name}`}
          >
            {APP_CONTEXT.user.initials}
          </span>
        </div>
      </div>
    </header>
  )
}
