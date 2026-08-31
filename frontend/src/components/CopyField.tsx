import { Copy, Check } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from './Button';

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
    <div className="space-y-1.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        <Button
          variant="ghost"
          fullWidth
          onClick={handleCopy}
          className="shrink-0 px-2.5 py-2 text-xs sm:w-auto sm:py-1.5"
        >
          {copied ? (
            <>
              <Check size={14} aria-hidden="true" />
              Copiado
            </>
          ) : (
            <>
              <Copy size={14} aria-hidden="true" />
              Copiar
            </>
          )}
        </Button>
      </div>
      <pre className="max-w-full overflow-x-auto rounded-md border border-zinc-300 bg-zinc-50 p-3 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-zinc-950 sm:text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
        {value}
      </pre>
    </div>
  );
}
