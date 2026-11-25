import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from '../hooks/useTheme';

type ThemeToggleProps = {
  showLabel?: boolean;
  className?: string;
};

export function ThemeToggle({ showLabel = false, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className={`focus-ring inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 text-xs font-medium text-[var(--ink-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink)] active:scale-[0.98] ${className}`}
    >
      {isDark ? (
        <Sun size={16} weight="regular" aria-hidden="true" />
      ) : (
        <Moon size={16} weight="regular" aria-hidden="true" />
      )}
      {showLabel && <span>{isDark ? 'Modo claro' : 'Modo escuro'}</span>}
    </button>
  );
}
