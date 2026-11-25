import type { ToolCategory, ToolDefinition } from '../../config/tools';

export type CatalogCategoryFilter = 'all' | 'pinned' | ToolCategory;

export const MAX_RECENT_TOOLS = 4;

export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function matchesToolQuery(tool: ToolDefinition, rawQuery: string): boolean {
  const term = normalizeSearchText(rawQuery.trim());
  if (!term) {
    return true;
  }

  const searchable = normalizeSearchText(
    [tool.title, tool.shortDescription, tool.description, tool.category, ...tool.tags].join(' '),
  );
  return searchable.includes(term);
}

export function filterCatalogTools(
  items: readonly ToolDefinition[],
  options: {
    query: string;
    category: CatalogCategoryFilter;
    pinnedIds: readonly string[];
  },
): ToolDefinition[] {
  const { query, category, pinnedIds } = options;
  const hasQuery = Boolean(query.trim());

  const filtered = items.filter((tool) => {
    if (category === 'pinned' && !pinnedIds.includes(tool.id)) {
      return false;
    }
    if (category !== 'all' && category !== 'pinned' && tool.category !== category) {
      return false;
    }
    return matchesToolQuery(tool, query);
  });

  if (category === 'all' && !hasQuery && pinnedIds.length > 0) {
    return [...filtered].sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id) ? 0 : 1;
      const bPinned = pinnedIds.includes(b.id) ? 0 : 1;
      return aPinned - bPinned;
    });
  }

  return filtered;
}

export function pushRecentToolId(
  currentIds: readonly string[],
  nextId: string,
  maxItems = MAX_RECENT_TOOLS,
): string[] {
  return [nextId, ...currentIds.filter((id) => id !== nextId)].slice(0, maxItems);
}
