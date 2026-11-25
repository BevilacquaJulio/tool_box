import type { ReactNode } from 'react';
import { File, Image } from '@phosphor-icons/react';

export type ConvertMode = 'images' | 'documents';

type ConvertModeSelectorProps = {
  value: ConvertMode;
  onChange: (mode: ConvertMode) => void;
  disabled?: boolean;
};

const modes: Array<{
  value: ConvertMode;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    value: 'images',
    label: 'Imagens e RAW',
    description: 'PNG, JPG, WebP, AVIF, BMP, GIF, HEIC e RAW',
    icon: <Image size={18} weight="duotone" aria-hidden="true" />,
  },
  {
    value: 'documents',
    label: 'Documentos e planilhas',
    description: 'PDF, Word (.docx), XLSX, CSV, Markdown, HTML, TXT, JSON e XML',
    icon: <File size={18} weight="duotone" aria-hidden="true" />,
  },
];

export function ConvertModeSelector({ value, onChange, disabled }: ConvertModeSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Modo de conversão"
      className="studio-panel grid grid-cols-1 gap-1.5 p-1.5 sm:grid-cols-2"
    >
      {modes.map((mode) => {
        const isActive = value === mode.value;

        return (
          <button
            key={mode.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => onChange(mode.value)}
            className={`focus-ring flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${
              isActive
                ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--ink)]'
                : 'border-transparent text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink)]'
            }`}
          >
            <span
              className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg border ${
                isActive
                  ? 'border-[var(--accent-border)] bg-[var(--bg-panel)] text-[var(--accent)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-muted)]'
              }`}
            >
              {mode.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold sm:text-sm">{mode.label}</span>
              <span className="mt-0.5 block truncate text-xs text-[var(--ink-muted)]">
                {mode.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
