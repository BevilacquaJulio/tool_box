import {
  ClockCounterClockwise,
  MagnifyingGlass,
  PushPin,
  Rows,
  SquaresFour,
  X,
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ToolCard } from '../../../components/ToolCard';
import {
  TOOL_CATEGORIES,
  tools,
  type ToolDefinition,
} from '../../../config/tools';
import { useWorkbenchPreferences } from '../../../hooks/useWorkbenchPreferences';
import {
  filterCatalogTools,
  type CatalogCategoryFilter,
} from '../../../lib/workbench/catalog';

export function ToolCatalog() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CatalogCategoryFilter>('all');
  const {
    pinnedIds,
    recentIds,
    isPinned,
    togglePin,
    catalogView,
    setCatalogView,
  } = useWorkbenchPreferences();

  const recentTools = useMemo(
    () =>
      recentIds
        .map((id) => tools.find((tool) => tool.id === id))
        .filter((tool): tool is ToolDefinition => Boolean(tool)),
    [recentIds],
  );

  const filteredTools = useMemo(
    () =>
      filterCatalogTools(tools, {
        query,
        category: activeCategory,
        pinnedIds,
      }),
    [query, activeCategory, pinnedIds],
  );

  const filterTabs: Array<{ id: CatalogCategoryFilter; label: string; count: number }> = [
    { id: 'all', label: 'Todas', count: tools.length },
    { id: 'pinned', label: 'Fixadas', count: pinnedIds.length },
    ...TOOL_CATEGORIES.map((category) => ({
      id: category,
      label: category,
      count: tools.filter((tool) => tool.category === category).length,
    })),
  ];

  const showRecentBar = !query.trim() && activeCategory === 'all' && recentTools.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5">
      <section className="studio-panel p-4 sm:p-5" aria-label="Controles do painel">
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative flex min-h-10.5 flex-1 items-center rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3.5 transition-[border-color,box-shadow,background-color] focus-within:border-[var(--accent)] focus-within:bg-[var(--bg-panel)] focus-within:ring-3 focus-within:ring-[var(--accent-soft)]">
            <span className="sr-only">Filtrar ferramentas</span>
            <MagnifyingGlass
              size={17}
              className="shrink-0 text-[var(--accent)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtrar por nome, formato ou protocolo (bcrypt, pix, yaml, pdf, youtube, mysql...)"
              className="w-full min-w-0 border-0 bg-transparent px-2.5 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpar filtro"
                className="focus-ring inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--bg-panel)] hover:text-[var(--ink)]"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </label>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="font-mono text-xs text-[var(--ink-muted)]">
              {filteredTools.length} {filteredTools.length === 1 ? 'ferramenta' : 'ferramentas'}
            </span>

            <div
              role="group"
              aria-label="Modo de visualização"
              className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-0.5"
            >
              <button
                type="button"
                onClick={() => setCatalogView('grid')}
                aria-pressed={catalogView === 'grid'}
                aria-label="Visualização em grade"
                title="Grade"
                className={`focus-ring inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                  catalogView === 'grid'
                    ? 'bg-[var(--bg-panel)] text-[var(--ink)] shadow-2xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                <SquaresFour size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Grade</span>
              </button>
              <button
                type="button"
                onClick={() => setCatalogView('compact')}
                aria-pressed={catalogView === 'compact'}
                aria-label="Visualização compacta em lista"
                title="Lista compacta"
                className={`focus-ring inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                  catalogView === 'compact'
                    ? 'bg-[var(--bg-panel)] text-[var(--ink)] shadow-2xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                <Rows size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Categorias de ferramentas"
          className="mt-3.5 flex items-center gap-1.5 overflow-x-auto border-t border-[var(--border-subtle)] pt-3.5 pb-0.5"
        >
          {filterTabs.map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(tab.id)}
                className={`focus-ring inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition-colors duration-150 ${
                  isActive
                    ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--ink)]'
                    : 'border-transparent bg-transparent text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink)]'
                }`}
              >
                {tab.id === 'pinned' && (
                  <PushPin
                    size={12}
                    weight={isActive ? 'fill' : 'regular'}
                    className={isActive ? 'text-[var(--accent)]' : ''}
                    aria-hidden="true"
                  />
                )}
                <span>{tab.label}</span>
                <span className="rounded bg-[var(--bg-subtle)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--ink-muted)]">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {showRecentBar && (
        <section
          aria-label="Acessadas recentemente"
          className="flex flex-wrap items-center gap-2 px-1"
        >
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
            <ClockCounterClockwise size={14} className="text-[var(--accent)]" aria-hidden="true" />
            Recentes:
          </span>

          {recentTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={`recent-chip-${tool.id}`}
                to={tool.path}
                className="focus-ring inline-flex min-h-8 items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-1 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:border-[var(--accent-border)] hover:text-[var(--ink)]"
              >
                <Icon size={14} weight="duotone" className="text-[var(--accent)]" aria-hidden="true" />
                <span>{tool.title}</span>
              </Link>
            );
          })}
        </section>
      )}

      {filteredTools.length > 0 ? (
        catalogView === 'compact' ? (
          <section
            aria-label="Lista de ferramentas"
            aria-live="polite"
            className="studio-panel divide-y divide-[var(--border-subtle)] overflow-hidden"
          >
            {filteredTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                pinned={isPinned(tool.id)}
                onTogglePin={togglePin}
                compact
              />
            ))}
          </section>
        ) : (
          <ul
            aria-label="Grade de ferramentas"
            aria-live="polite"
            className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3"
          >
            {filteredTools.map((tool) => (
              <li key={tool.id}>
                <ToolCard
                  tool={tool}
                  pinned={isPinned(tool.id)}
                  onTogglePin={togglePin}
                />
              </li>
            ))}
          </ul>
        )
      ) : (
        <div
          role="status"
          className="studio-panel flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center"
        >
          <span className="mb-3 inline-flex size-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--accent)]">
            {activeCategory === 'pinned' ? (
              <PushPin size={20} weight="duotone" aria-hidden="true" />
            ) : (
              <MagnifyingGlass size={20} weight="duotone" aria-hidden="true" />
            )}
          </span>
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            {activeCategory === 'pinned' && !query
              ? 'Nenhuma ferramenta fixada'
              : 'Nenhuma ferramenta encontrada'}
          </h2>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--ink-muted)]">
            {activeCategory === 'pinned' && !query
              ? 'Use o ícone de alfinete em qualquer card ou no cabeçalho de uma ferramenta para mantê-la no topo.'
              : 'Altere o termo de busca ou volte para a categoria Todas.'}
          </p>
          {(query || activeCategory !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setActiveCategory('all');
              }}
              className="focus-ring mt-4 inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3.5 text-xs font-medium text-[var(--ink)] hover:border-[var(--accent-border)]"
            >
              Mostrar todas as ferramentas
            </button>
          )}
        </div>
      )}
    </div>
  );
}
