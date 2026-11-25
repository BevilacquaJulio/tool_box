import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { tools } from '../config/tools';
import { pushRecentToolId } from '../lib/workbench/catalog';

export type CatalogViewMode = 'grid' | 'compact';

type WorkbenchPreferencesValue = {
  pinnedIds: string[];
  recentIds: string[];
  sidebarCollapsed: boolean;
  catalogView: CatalogViewMode;
  commandOpen: boolean;
  isPinned: (toolId: string) => boolean;
  togglePin: (toolId: string) => void;
  toggleSidebar: () => void;
  setCatalogView: (mode: CatalogViewMode) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  clearRecent: () => void;
};

const STORAGE_KEYS = {
  pinned: 'toolbox:pinned-tools',
  recent: 'toolbox:recent-tools',
  sidebar: 'toolbox:sidebar-collapsed',
  view: 'toolbox:catalog-view',
} as const;

const validToolIds = new Set(tools.map((tool) => tool.id));

function readStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string' && validToolIds.has(item));
  } catch {
    return [];
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignora bloqueios de armazenamento em navegação restrita.
  }
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

const WorkbenchPreferencesContext = createContext<WorkbenchPreferencesValue | null>(null);

export function WorkbenchPreferencesProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [pinnedIds, setPinnedIds] = useState<string[]>(() => readStringArray(STORAGE_KEYS.pinned));
  const [recentIds, setRecentIds] = useState<string[]>(() => readStringArray(STORAGE_KEYS.recent));
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.sidebar) === 'true';
    } catch {
      return false;
    }
  });
  const [catalogView, setCatalogViewState] = useState<CatalogViewMode>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.view) === 'compact' ? 'compact' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const [commandOpen, setCommandOpen] = useState(false);

  // Registra ferramentas visitadas para retomada rápida no painel e no Ctrl+K.
  useEffect(() => {
    const activeTool = tools.find((tool) => tool.path === location.pathname);
    if (!activeTool) {
      return;
    }

    setRecentIds((current) => {
      const next = pushRecentToolId(current, activeTool.id);
      writeJson(STORAGE_KEYS.recent, next);
      return next;
    });
  }, [location.pathname]);

  // Atalhos globais: Ctrl/Cmd+K para paleta, "/" fora de campos de texto e Alt+1..8 para ferramentas.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
        return;
      }

      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (!isEditableElement(event.target) && !commandOpen) {
          event.preventDefault();
          setCommandOpen(true);
        }
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const number = Number(event.key);
        if (Number.isInteger(number) && number >= 1 && number <= tools.length) {
          const targetTool = tools.find((tool) => tool.shortcutNumber === number);
          if (targetTool?.available) {
            event.preventDefault();
            setCommandOpen(false);
            navigate(targetTool.path);
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandOpen, navigate]);

  const isPinned = useCallback((toolId: string) => pinnedIds.includes(toolId), [pinnedIds]);

  const togglePin = useCallback((toolId: string) => {
    setPinnedIds((current) => {
      const next = current.includes(toolId)
        ? current.filter((id) => id !== toolId)
        : [...current, toolId];
      writeJson(STORAGE_KEYS.pinned, next);
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEYS.sidebar, String(next));
      } catch {
        // Ignora bloqueios de armazenamento.
      }
      return next;
    });
  }, []);

  const setCatalogView = useCallback((mode: CatalogViewMode) => {
    setCatalogViewState(mode);
    try {
      localStorage.setItem(STORAGE_KEYS.view, mode);
    } catch {
      // Ignora bloqueios de armazenamento.
    }
  }, []);

  const openCommandPalette = useCallback(() => setCommandOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandOpen(false), []);

  const clearRecent = useCallback(() => {
    setRecentIds([]);
    writeJson(STORAGE_KEYS.recent, []);
  }, []);

  const value = useMemo<WorkbenchPreferencesValue>(
    () => ({
      pinnedIds,
      recentIds,
      sidebarCollapsed,
      catalogView,
      commandOpen,
      isPinned,
      togglePin,
      toggleSidebar,
      setCatalogView,
      openCommandPalette,
      closeCommandPalette,
      clearRecent,
    }),
    [
      pinnedIds,
      recentIds,
      sidebarCollapsed,
      catalogView,
      commandOpen,
      isPinned,
      togglePin,
      toggleSidebar,
      setCatalogView,
      openCommandPalette,
      closeCommandPalette,
      clearRecent,
    ],
  );

  return (
    <WorkbenchPreferencesContext.Provider value={value}>
      {children}
    </WorkbenchPreferencesContext.Provider>
  );
}

export function useWorkbenchPreferences() {
  const context = useContext(WorkbenchPreferencesContext);
  if (!context) {
    throw new Error('useWorkbenchPreferences deve ser usado dentro de WorkbenchPreferencesProvider');
  }
  return context;
}
