import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function syncThemeToDocument(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem('theme', theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    syncThemeToDocument(theme);
  }, []);

  const applyTheme = useCallback((next: Theme) => {
    const update = () => {
      syncThemeToDocument(next);
      flushSync(() => {
        setThemeState(next);
      });
    };

    if (typeof document.startViewTransition === 'function') {
      document.documentElement.dataset.themeTransition = 'active';

      const transition = document.startViewTransition(update);
      void transition.finished.finally(() => {
        delete document.documentElement.dataset.themeTransition;
      });
      return;
    }

    update();
  }, []);

  const setTheme = useCallback(
    (value: Theme) => {
      applyTheme(value);
    },
    [applyTheme],
  );

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [applyTheme, theme]);

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
}
