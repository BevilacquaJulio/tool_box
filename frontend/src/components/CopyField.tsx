import { Check, Copy } from '@phosphor-icons/react';
import { useState } from 'react';

type CopyFieldProps = {
  label: string;
  value: string;
};

export function CopyField({ label, value }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-xs font-medium text-[var(--ink-secondary)]">{label}</span>
          <span className="shrink-0 font-mono text-[10px] text-[var(--ink-muted)]">
            {value.length} chars
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={`focus-ring inline-flex min-h-7.5 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-150 active:scale-[0.98] ${
            copied
              ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
              : 'border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:border-[var(--accent-border)] hover:text-[var(--ink)]'
          }`}
        >
          {copied ? (
            <>
              <Check size={13} weight="bold" aria-hidden="true" />
              Copiado
            </>
          ) : (
            <>
              <Copy size={13} aria-hidden="true" />
              Copiar
            </>
          )}
        </button>
      </div>

      <pre className="max-h-80 max-w-full overflow-auto p-3.5 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-[var(--ink)]">
        {value}
      </pre>
    </div>
  );
}
