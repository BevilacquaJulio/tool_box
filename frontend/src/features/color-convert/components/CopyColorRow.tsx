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
    <div className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <span className="w-16 shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-950 dark:text-zinc-50">{value}</code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copiar ${label}`}
        className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1 rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
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
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={() => {
        onSelect?.();
        void handleCopy();
      }}
      className="group cursor-pointer space-y-2 text-left"
      title={`Copiar ${hex}`}
    >
      <span
        className="block aspect-square w-full rounded-md border border-zinc-200 shadow-sm transition-transform group-hover:scale-[1.02] dark:border-zinc-700"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <span className="block font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
        {copied ? 'Copiado' : hex}
      </span>
    </button>
  );
}
