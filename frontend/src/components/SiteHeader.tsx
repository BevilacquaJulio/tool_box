import {
  CaretRight,
  List,
  MagnifyingGlass,
  PlugsConnected,
  PushPin,
  ShieldCheck,
} from '@phosphor-icons/react';
import { Link, useLocation } from 'react-router-dom';
import { tools } from '../config/tools';
import { useWorkbenchPreferences } from '../hooks/useWorkbenchPreferences';
import { APP_HEADER_INNER_CLASS } from '../layout/content';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

type SiteHeaderProps = {
  onOpenMobileNav: () => void;
};

export function SiteHeader({ onOpenMobileNav }: SiteHeaderProps) {
  const location = useLocation();
  const { openCommandPalette, isPinned, togglePin } = useWorkbenchPreferences();

  const currentTool = tools.find((tool) => tool.path === location.pathname);
  const pinned = currentTool ? isPinned(currentTool.id) : false;

  return (
    <header className="sticky top-0 z-20 h-14 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-app)]/85 backdrop-blur-md">
      <div className={APP_HEADER_INNER_CLASS}>
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Abrir navegação de ferramentas"
            className="focus-ring inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--ink)] lg:hidden"
          >
            <List size={18} aria-hidden="true" />
          </button>

          <Link
            to="/"
            aria-label="Toolbox, painel inicial"
            className="focus-ring inline-flex items-center rounded-md lg:hidden"
          >
            <Logo />
          </Link>

          <nav
            aria-label="Localização atual"
            className="hidden min-w-0 items-center gap-2 text-sm lg:flex"
          >
            {currentTool ? (
              <>
                <Link
                  to="/"
                  className="focus-ring rounded px-1 py-0.5 text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
                >
                  Painel
                </Link>
                <CaretRight size={13} className="shrink-0 text-[var(--ink-muted)]" aria-hidden="true" />
                <span className="text-[var(--ink-muted)]">{currentTool.category}</span>
                <CaretRight size={13} className="shrink-0 text-[var(--ink-muted)]" aria-hidden="true" />
                <span className="truncate font-semibold text-[var(--ink)]">{currentTool.title}</span>
              </>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="font-semibold text-[var(--ink)]">Painel de Ferramentas</span>
                <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
                  {tools.length} utilitários
                </span>
              </div>
            )}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {currentTool && (
            <>
              <span className="hidden items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-1 font-mono text-[11px] text-[var(--ink-muted)] md:inline-flex">
                {currentTool.processing === 'local' ? (
                  <>
                    <ShieldCheck size={14} className="text-[var(--accent)]" aria-hidden="true" />
                    Execução local
                  </>
                ) : (
                  <>
                    <PlugsConnected size={14} className="text-[var(--accent)]" aria-hidden="true" />
                    API interna
                  </>
                )}
              </span>

              <button
                type="button"
                onClick={() => togglePin(currentTool.id)}
                aria-pressed={pinned}
                aria-label={pinned ? 'Desafixar ferramenta' : 'Fixar ferramenta'}
                title={pinned ? 'Remover das fixadas' : 'Fixar na barra lateral'}
                className={`focus-ring inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors duration-150 active:scale-[0.98] ${
                  pinned
                    ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--ink)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink)]'
                }`}
              >
                <PushPin
                  size={15}
                  weight={pinned ? 'fill' : 'regular'}
                  className={pinned ? 'text-[var(--accent)]' : ''}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">{pinned ? 'Fixada' : 'Fixar'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Abrir busca rápida (Ctrl+K)"
            className="focus-ring inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 text-xs font-medium text-[var(--ink-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink)] active:scale-[0.98]"
          >
            <MagnifyingGlass size={15} className="text-[var(--accent)]" aria-hidden="true" />
            <span className="hidden sm:inline">Buscar</span>
            <kbd className="hidden rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)] md:inline-block">
              Ctrl K
            </kbd>
          </button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
