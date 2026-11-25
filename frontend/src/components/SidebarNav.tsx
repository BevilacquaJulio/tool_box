import {
  MagnifyingGlass,
  PushPin,
  ShieldCheck,
  SidebarSimple,
  SquaresFour,
  X,
} from '@phosphor-icons/react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TOOL_CATEGORIES, tools, type ToolDefinition } from '../config/tools';
import { useWorkbenchPreferences } from '../hooks/useWorkbenchPreferences';
import { Logo } from './Logo';

type SidebarNavProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

function NavToolLink({
  tool,
  active,
  collapsed,
  onNavigate,
}: {
  tool: ToolDefinition;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = tool.icon;

  return (
    <Link
      to={tool.path}
      onClick={onNavigate}
      title={collapsed ? `${tool.title} (Alt+${tool.shortcutNumber})` : undefined}
      aria-current={active ? 'page' : undefined}
      className={`focus-ring group relative flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
        collapsed ? 'justify-center px-0' : ''
      } ${
        active
          ? 'bg-[var(--accent-soft)] text-[var(--ink)]'
          : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-panel)]/70 hover:text-[var(--ink)]'
      }`}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-[var(--accent)]"
        />
      )}

      <Icon
        size={17}
        weight={active ? 'fill' : 'duotone'}
        aria-hidden="true"
        className={`shrink-0 transition-colors ${
          active ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)] group-hover:text-[var(--ink)]'
        }`}
      />

      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{tool.title}</span>
          <span className="hidden font-mono text-[10px] text-[var(--ink-muted)] opacity-0 transition-opacity group-hover:opacity-100 xl:inline">
            {tool.shortcutNumber}
          </span>
        </>
      )}
    </Link>
  );
}

function SidebarContent({
  collapsed,
  onToggleCollapse,
  onNavigate,
  isMobile = false,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  isMobile?: boolean;
}) {
  const location = useLocation();
  const { pinnedIds, openCommandPalette } = useWorkbenchPreferences();

  const pinnedTools = pinnedIds
    .map((id) => tools.find((tool) => tool.id === id))
    .filter((tool): tool is ToolDefinition => Boolean(tool));

  const isHome = location.pathname === '/';
  const localCount = tools.filter((tool) => tool.processing === 'local').length;
  const hybridCount = tools.length - localCount;

  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-14 shrink-0 items-center border-b border-[var(--border-subtle)] ${
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        <Link
          to="/"
          onClick={onNavigate}
          aria-label="Toolbox, painel inicial"
          className="focus-ring inline-flex min-w-0 items-center rounded-md"
        >
          <Logo compact={collapsed} />
        </Link>

        {!collapsed && !isMobile && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Recolher barra lateral"
            title="Recolher barra lateral"
            className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-[var(--ink-muted)] transition-colors hover:bg-[var(--bg-panel)] hover:text-[var(--ink)]"
          >
            <SidebarSimple size={17} aria-hidden="true" />
          </button>
        )}

        {isMobile && onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Fechar menu de navegação"
            className="focus-ring inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--bg-panel)] hover:text-[var(--ink)]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            openCommandPalette();
          }}
          aria-label="Buscar ferramenta (Ctrl+K)"
          title={collapsed ? 'Buscar ferramenta (Ctrl+K)' : undefined}
          className={`focus-ring flex min-h-9 w-full cursor-pointer items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-xs text-[var(--ink-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--ink)] ${
            collapsed ? 'justify-center px-0' : 'justify-between gap-2 px-3'
          }`}
        >
          <span className="inline-flex items-center gap-2 truncate">
            <MagnifyingGlass size={15} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />
            {!collapsed && <span>Ir para...</span>}
          </span>
          {!collapsed && (
            <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]">
              Ctrl K
            </kbd>
          )}
        </button>
      </div>

      <nav
        aria-label="Ferramentas do sistema"
        className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
      >
        <div className="space-y-1">
          <Link
            to="/"
            onClick={onNavigate}
            title={collapsed ? 'Painel inicial' : undefined}
            aria-current={isHome ? 'page' : undefined}
            className={`focus-ring relative flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
              collapsed ? 'justify-center px-0' : ''
            } ${
              isHome
                ? 'bg-[var(--accent-soft)] text-[var(--ink)]'
                : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-panel)]/70 hover:text-[var(--ink)]'
            }`}
          >
            {isHome && (
              <span
                aria-hidden="true"
                className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-[var(--accent)]"
              />
            )}
            <SquaresFour
              size={17}
              weight={isHome ? 'fill' : 'duotone'}
              aria-hidden="true"
              className={isHome ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'}
            />
            {!collapsed && <span>Painel</span>}
          </Link>
        </div>

        {pinnedTools.length > 0 && (
          <div className="space-y-1">
            {!collapsed && (
              <p className="flex items-center gap-1.5 px-2.5 pb-1 font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
                <PushPin size={11} weight="fill" className="text-[var(--accent)]" aria-hidden="true" />
                Fixadas
              </p>
            )}
            {pinnedTools.map((tool) => (
              <NavToolLink
                key={`pin-${tool.id}`}
                tool={tool}
                active={location.pathname === tool.path}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}

        {TOOL_CATEGORIES.map((category) => {
          const categoryTools = tools.filter((tool) => tool.category === category);
          return (
            <div key={category} className="space-y-1">
              {!collapsed ? (
                <p className="px-2.5 pb-1 font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
                  {category}
                </p>
              ) : (
                <div className="mx-2 border-t border-[var(--border-subtle)]" aria-hidden="true" />
              )}
              {categoryTools.map((tool) => (
                <NavToolLink
                  key={tool.id}
                  tool={tool}
                  active={location.pathname === tool.path}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-[var(--border-subtle)] p-3">
        {collapsed && !isMobile ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expandir barra lateral"
            title="Expandir barra lateral"
            className="focus-ring flex min-h-9 w-full cursor-pointer items-center justify-center rounded-lg text-[var(--ink-muted)] transition-colors hover:bg-[var(--bg-panel)] hover:text-[var(--ink)]"
          >
            <SidebarSimple size={17} aria-hidden="true" />
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)]/70 px-2.5 py-2 text-[11px] text-[var(--ink-muted)]">
            <ShieldCheck size={15} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />
            <span className="truncate font-mono">
              {localCount} locais · {hybridCount} API
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SidebarNav({ mobileOpen, onCloseMobile }: SidebarNavProps) {
  const { sidebarCollapsed, toggleSidebar } = useWorkbenchPreferences();

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseMobile();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      <aside
        aria-label="Menu lateral"
        className={`hidden lg:sticky lg:top-0 lg:z-30 lg:block lg:h-[100dvh] lg:shrink-0 lg:border-r lg:border-[var(--border-subtle)] lg:bg-[var(--bg-rail)] lg:transition-[width] lg:duration-200 ${
          sidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-[248px]'
        }`}
      >
        <SidebarContent collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navegação de ferramentas"
        >
          <button
            type="button"
            aria-label="Fechar navegação"
            onClick={onCloseMobile}
            className="fixed inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
          />
          <div className="relative z-10 h-full w-[min(18.5rem,86vw)] border-r border-[var(--border-strong)] bg-[var(--bg-rail)] shadow-2xl">
            <SidebarContent collapsed={false} onNavigate={onCloseMobile} isMobile />
          </div>
        </div>
      )}
    </>
  );
}
