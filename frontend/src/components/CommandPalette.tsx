import {
  ArrowElbowDownLeft,
  ClockCounterClockwise,
  MagnifyingGlass,
  Moon,
  PushPin,
  Rows,
  SquaresFour,
  Sun,
  Trash,
  X,
  type Icon,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { tools } from '../config/tools';
import { useTheme } from '../hooks/useTheme';
import { useWorkbenchPreferences } from '../hooks/useWorkbenchPreferences';
import { matchesToolQuery, normalizeSearchText } from '../lib/workbench/catalog';

type PaletteEntry = {
  id: string;
  group: string;
  label: string;
  description: string;
  icon: Icon;
  shortcut?: string;
  tags?: string[];
  onSelect: () => void;
};

export function CommandPalette() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const {
    commandOpen,
    closeCommandPalette,
    pinnedIds,
    recentIds,
    catalogView,
    setCatalogView,
    clearRecent,
  } = useWorkbenchPreferences();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!commandOpen) {
      return;
    }
    setQuery('');
    setActiveIndex(0);
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [commandOpen]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const term = normalizeSearchText(query.trim());

    const systemEntries: PaletteEntry[] = [
      {
        id: 'sys-home',
        group: 'Sistema',
        label: 'Ir para o Painel de Ferramentas',
        description: 'Visão geral de todas as ferramentas e filtros',
        icon: SquaresFour,
        onSelect: () => {
          closeCommandPalette();
          navigate('/');
        },
      },
      {
        id: 'sys-theme',
        group: 'Sistema',
        label: theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro',
        description: 'Muda a aparência global do sistema',
        icon: theme === 'dark' ? Sun : Moon,
        onSelect: () => {
          toggleTheme();
          closeCommandPalette();
        },
      },
      {
        id: 'sys-view',
        group: 'Sistema',
        label:
          catalogView === 'grid'
            ? 'Usar visualização em lista compacta no painel'
            : 'Usar visualização em grade no painel',
        description: 'Alterna a densidade dos cards na tela inicial',
        icon: catalogView === 'grid' ? Rows : SquaresFour,
        onSelect: () => {
          setCatalogView(catalogView === 'grid' ? 'compact' : 'grid');
          closeCommandPalette();
          if (location.pathname !== '/') {
            navigate('/');
          }
        },
      },
    ];

    if (recentIds.length > 0) {
      systemEntries.push({
        id: 'sys-clear-recent',
        group: 'Sistema',
        label: 'Limpar ferramentas recentes',
        description: 'Remove o histórico local de acessos recentes',
        icon: Trash,
        onSelect: () => {
          clearRecent();
          closeCommandPalette();
        },
      });
    }

    if (term) {
      const matchedTools: PaletteEntry[] = tools
        .filter((tool) => tool.available && matchesToolQuery(tool, query))
        .map((tool) => ({
          id: `tool-${tool.id}`,
          group: 'Ferramentas',
          label: tool.title,
          description: tool.shortDescription,
          icon: tool.icon,
          shortcut: `Alt+${tool.shortcutNumber}`,
          tags: tool.tags.slice(0, 3),
          onSelect: () => {
            closeCommandPalette();
            navigate(tool.path);
          },
        }));

      const matchedSystem = systemEntries.filter((entry) =>
        normalizeSearchText(`${entry.label} ${entry.description}`).includes(term),
      );

      return [...matchedTools, ...matchedSystem];
    }

    const usedToolIds = new Set<string>();
    const pinnedEntries: PaletteEntry[] = [];
    const recentEntries: PaletteEntry[] = [];

    for (const id of pinnedIds) {
      const tool = tools.find((item) => item.id === id && item.available);
      if (tool) {
        usedToolIds.add(tool.id);
        pinnedEntries.push({
          id: `pinned-${tool.id}`,
          group: 'Fixadas',
          label: tool.title,
          description: tool.shortDescription,
          icon: PushPin,
          shortcut: `Alt+${tool.shortcutNumber}`,
          onSelect: () => {
            closeCommandPalette();
            navigate(tool.path);
          },
        });
      }
    }

    for (const id of recentIds) {
      if (usedToolIds.has(id)) {
        continue;
      }
      const tool = tools.find((item) => item.id === id && item.available);
      if (tool) {
        usedToolIds.add(tool.id);
        recentEntries.push({
          id: `recent-${tool.id}`,
          group: 'Recentes',
          label: tool.title,
          description: tool.shortDescription,
          icon: ClockCounterClockwise,
          shortcut: `Alt+${tool.shortcutNumber}`,
          onSelect: () => {
            closeCommandPalette();
            navigate(tool.path);
          },
        });
      }
    }

    const remainingToolEntries: PaletteEntry[] = tools
      .filter((tool) => tool.available && !usedToolIds.has(tool.id))
      .map((tool) => ({
        id: `tool-${tool.id}`,
        group: 'Ferramentas',
        label: tool.title,
        description: tool.shortDescription,
        icon: tool.icon,
        shortcut: `Alt+${tool.shortcutNumber}`,
        onSelect: () => {
          closeCommandPalette();
          navigate(tool.path);
        },
      }));

    return [...pinnedEntries, ...recentEntries, ...remainingToolEntries, ...systemEntries];
  }, [
    query,
    theme,
    catalogView,
    recentIds,
    pinnedIds,
    location.pathname,
    closeCommandPalette,
    navigate,
    toggleTheme,
    setCatalogView,
    clearRecent,
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!commandOpen) {
      return;
    }
    const activeNode = listRef.current?.querySelector<HTMLElement>(
      `[data-palette-index="${activeIndex}"]`,
    );
    activeNode?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, commandOpen]);

  useEffect(() => {
    if (!commandOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCommandPalette();
        return;
      }

      if (entries.length === 0) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % entries.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + entries.length) % entries.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        entries[activeIndex]?.onSelect();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandOpen, entries, activeIndex, closeCommandPalette]);

  if (!commandOpen) {
    return null;
  }

  const groups = Array.from(new Set(entries.map((entry) => entry.group)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh] pb-6 sm:pt-[13vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Busca rápida de ferramentas e comandos"
    >
      <button
        type="button"
        aria-label="Fechar busca rápida"
        onClick={closeCommandPalette}
        className="fixed inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
      />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
          <MagnifyingGlass size={18} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ir para ferramenta, formato (bcrypt, pix, yaml, pdf...) ou ação..."
            aria-label="Filtrar ferramentas e comandos"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
              className="focus-ring inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink)]"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
          <kbd className="hidden rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)] sm:inline-block">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2" role="listbox">
          {entries.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-[var(--ink)]">Nenhum resultado para "{query}"</p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Busque pelo nome da ferramenta ou formato, como bcrypt, jwt, pix, csv, diff ou mysql.
              </p>
            </div>
          ) : (
            groups.map((groupName) => {
              const groupItems = entries
                .map((entry, idx) => ({ entry, idx }))
                .filter((item) => item.entry.group === groupName);

              return (
                <div key={groupName} className="mb-2 last:mb-0">
                  <p className="px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
                    {groupName}
                  </p>
                  <div className="space-y-0.5">
                    {groupItems.map(({ entry, idx }) => {
                      const IconComponent = entry.icon;
                      const isActive = idx === activeIndex;

                      return (
                        <button
                          key={entry.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          data-palette-index={idx}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={entry.onSelect}
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors duration-100 ${
                            isActive
                              ? 'bg-[var(--accent-soft)] text-[var(--ink)]'
                              : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          <span
                            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg border ${
                              isActive
                                ? 'border-[var(--accent-border)] bg-[var(--bg-panel)] text-[var(--accent)]'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-muted)]'
                            }`}
                          >
                            <IconComponent size={16} weight="duotone" aria-hidden="true" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-[var(--ink)]">
                                {entry.label}
                              </span>
                              {entry.tags?.map((tag) => (
                                <span
                                  key={tag}
                                  className="hidden rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)] sm:inline-block"
                                >
                                  {tag}
                                </span>
                              ))}
                            </span>
                            <span className="block truncate text-xs text-[var(--ink-muted)]">
                              {entry.description}
                            </span>
                          </span>

                          {entry.shortcut && (
                            <kbd className="hidden shrink-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)] sm:inline-block">
                              {entry.shortcut}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-2 text-[11px] text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <ArrowElbowDownLeft size={13} aria-hidden="true" />
            Enter para abrir
          </span>
          <span className="font-mono text-[10px]">
            Setas navegam · Alt+1..{tools.length} acesso direto
          </span>
        </div>
      </div>
    </div>
  );
}
