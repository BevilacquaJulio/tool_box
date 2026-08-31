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
    label: 'Imagens',
    description: 'PNG, JPG, WebP, HEIC, RAW...',
    icon: <Image size={18} aria-hidden="true" />,
  },
  {
    value: 'documents',
    label: 'Documentos',
    description: 'PDF, Word (.docx), TXT, Markdown, HTML, XLSX, CSV, JSON, XML...',
    icon: <File size={18} aria-hidden="true" />,
  },
];

export function ConvertModeSelector({ value, onChange, disabled }: ConvertModeSelectorProps) {
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Modo</span>
      <div
        role="tablist"
        aria-label="Modo de conversão"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
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
              className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                isActive
                  ? 'border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                  : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/80'
              }`}
            >
              <span className={isActive ? 'text-white dark:text-zinc-950' : 'text-zinc-500 dark:text-zinc-400'}>
                {mode.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{mode.label}</span>
                <span
                  className={`mt-0.5 block text-xs ${
                    isActive ? 'text-zinc-200 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {mode.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
