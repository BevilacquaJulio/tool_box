import { Check, Copy } from '@phosphor-icons/react';
import { useState } from 'react';

type CopyColorRowProps = {
  label: string;
  value: string;
};

export function CopyColorRow({ label, value }: CopyColorRowProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
      <span className="w-16 shrink-0 font-mono text-[11px] font-medium uppercase text-[var(--ink-muted)]">
        {label}
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--ink)]">{value}</code>
      <button
        type="button"
        onClick={() => void handleCopy()}
        aria-label={`Copiar ${label}`}
        className={`focus-ring inline-flex min-h-7.5 shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors active:scale-[0.98] ${
          copied
            ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
            : 'border-[var(--border-strong)] bg-[var(--bg-panel)] text-[var(--ink-secondary)] hover:border-[var(--accent-border)] hover:text-[var(--ink)]'
        }`}
      >
        {copied ? <Check size={13} weight="bold" aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}

type ColorSwatchProps = {
  label: string;
  hex: string;
  color: string;
  onSelect?: () => void;
};

export function ColorSwatch({ label, hex, color, onSelect }: ColorSwatchProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(hex);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={() => {
        onSelect?.();
        void handleCopy();
      }}
      className="focus-ring group cursor-pointer rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-2 text-left transition-colors hover:border-[var(--accent-border)]"
      title={`Aplicar e copiar ${hex}`}
    >
      <span
        className="block h-12 w-full rounded-lg border border-black/10 shadow-2xs transition-transform duration-150 group-hover:scale-[1.02] dark:border-white/10"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="mt-2 block truncate text-[11px] font-medium text-[var(--ink-secondary)]">
        {label}
      </span>
      <span className="block truncate font-mono text-[10px] text-[var(--ink-muted)]">
        {copied ? 'Copiado' : hex}
      </span>
    </button>
  );
}
