import { File, Trash } from '@phosphor-icons/react';
import type { TextareaHTMLAttributes } from 'react';

type DiffEditorPanelProps = {
  title: string;
  fileName: string | null;
  onImport: () => void;
  onClear: () => void;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function DiffEditorPanel({
  title,
  fileName,
  onImport,
  onClear,
  className = '',
  ...props
}: DiffEditorPanelProps) {
  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</p>
          {fileName && (
            <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{fileName}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onImport}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <File size={14} aria-hidden="true" />
            Importar arquivo
          </button>
          {fileName && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Trash size={14} aria-hidden="true" />
              Remover
            </button>
          )}
        </div>
      </div>

      <textarea
        spellCheck={false}
        className={`min-h-64 w-full resize-y border-0 bg-zinc-50/80 px-4 py-3 font-mono text-[13px] leading-6 text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:bg-white dark:bg-zinc-900/60 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-950 ${className}`}
        {...props}
      />
    </div>
  );
}
