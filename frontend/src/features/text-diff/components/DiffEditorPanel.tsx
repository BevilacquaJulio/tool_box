import { File, Trash } from '@phosphor-icons/react';
import type { TextareaHTMLAttributes } from 'react';

type DiffEditorPanelProps = {
  title: string;
  badge?: string;
  fileName: string | null;
  onImport: () => void;
  onClear: () => void;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function DiffEditorPanel({
  title,
  badge,
  fileName,
  onImport,
  onClear,
  value,
  className = '',
  ...props
}: DiffEditorPanelProps) {
  const stringVal = typeof value === 'string' ? value : '';
  const lineCount = stringVal ? stringVal.split(/\r\n|\r|\n/).length : 0;
  const hasContent = Boolean(stringVal || fileName);

  return (
    <div className="studio-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-xs font-medium uppercase tracking-wider text-[var(--ink-secondary)]">
            {title}
          </span>
          {badge && (
            <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]">
              {badge}
            </span>
          )}
          {lineCount > 0 && (
            <span className="font-mono text-[10px] text-[var(--ink-muted)]">
              {lineCount} {lineCount === 1 ? 'linha' : 'linhas'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onImport}
            className="focus-ring inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:border-[var(--accent-border)] hover:text-[var(--ink)]"
          >
            <File size={13} aria-hidden="true" />
            Importar
          </button>
          {hasContent && (
            <button
              type="button"
              onClick={onClear}
              aria-label={`Limpar ${title.toLowerCase()}`}
              className="focus-ring inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--ink-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--ink)]"
            >
              <Trash size={13} aria-hidden="true" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {fileName && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 px-4 py-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
          {fileName}
        </div>
      )}

      <textarea
        spellCheck={false}
        value={value}
        className={`min-h-64 w-full resize-y border-0 bg-[var(--bg-subtle)]/55 px-4 py-3 font-mono text-xs leading-6 text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-muted)]/65 focus:bg-[var(--bg-panel)] sm:text-[13px] ${className}`}
        {...props}
      />
    </div>
  );
}
