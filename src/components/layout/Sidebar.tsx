import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { NAV_SECTIONS } from '../../data/navigation'

interface SidebarProps {
  /** Exibe o botão de fechar (modo drawer mobile). */
  showClose?: boolean
  onClose?: () => void
  /** Chamado ao clicar num item — usado para fechar o drawer. */
  onNavigate?: () => void
}

export function Sidebar({ showClose = false, onClose, onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col border-r border-edge/60 bg-surface-1">
      <div className="flex items-start gap-3 px-5 pb-4 pt-6">
        <div className="min-w-0 flex-1">
          <img
            src="/brand/mdias-logo-branco.png"
            alt="M. Dias Branco"
            className="h-16 w-auto max-w-full"
          />
          <p className="mt-1.5 text-xs font-medium text-ink-subtle">Torre de Controle · Trigo</p>
        </div>
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-subtle hover:bg-white/5 hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Navegação principal">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-gold/10 text-ink'
                          : 'text-ink-muted hover:bg-white/5 hover:text-ink'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-gold"
                            aria-hidden="true"
                          />
                        )}
                        <item.icon
                          size={18}
                          className={isActive ? 'text-gold' : 'text-ink-subtle'}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-edge/60 px-5 py-4">
        <p className="text-xs font-medium text-ink-muted">Monoda × Google Cloud</p>
        <p className="mt-0.5 text-[11px] text-ink-subtle">Confidencial — uso interno</p>
        <p className="mt-1 text-[10px] text-ink-faint">
          Clima:{' '}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:text-ink-subtle hover:underline"
          >
            Open-Meteo.com
          </a>{' '}
          (CC BY 4.0)
        </p>
      </div>
    </div>
  )
}
