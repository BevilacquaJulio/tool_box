import { ArrowsLeftRight, DownloadSimple, GitDiff } from '@phosphor-icons/react';
import { useRef, useState, type ChangeEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../../../components/Button';
import { StudioAlert, StudioPanel } from '../../../components/PageShell';
import { getErrorMessage } from '../../../lib/errors';
import { formatFileSize } from '../../../lib/image-convert';
import { useTextDiffMutation } from '../hooks/useTextDiffMutation';
import { DiffEditorPanel } from './DiffEditorPanel';
import { DiffPanel } from './DiffPanel';

type FormValues = {
  leftText: string;
  rightText: string;
  ignoreWhitespace: boolean;
  ignoreLineBreaks: boolean;
  ignoreCase: boolean;
};

function downloadText(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsText(file);
  });
}

export function TextDiffTool() {
  const diffMutation = useTextDiffMutation();
  const leftFileInputRef = useRef<HTMLInputElement>(null);
  const rightFileInputRef = useRef<HTMLInputElement>(null);
  const [leftFileName, setLeftFileName] = useState<string | null>(null);
  const [rightFileName, setRightFileName] = useState<string | null>(null);

  const { control, register, handleSubmit, getValues, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      leftText: '',
      rightText: '',
      ignoreWhitespace: false,
      ignoreLineBreaks: true,
      ignoreCase: false,
    },
  });

  const leftText = watch('leftText');
  const rightText = watch('rightText');
  const result = diffMutation.data;
  const activeError = diffMutation.error ? getErrorMessage(diffMutation.error) : null;

  async function onCompare(values: FormValues) {
    diffMutation.reset();
    await diffMutation.mutateAsync({
      leftText: values.leftText,
      rightText: values.rightText,
      leftLabel: leftFileName ?? 'Original',
      rightLabel: rightFileName ?? 'Comparação',
      options: {
        ignoreWhitespace: values.ignoreWhitespace,
        ignoreLineBreaks: values.ignoreLineBreaks,
        ignoreCase: values.ignoreCase,
      },
    });
  }

  function handleSwapSides() {
    const currentLeft = getValues('leftText');
    const currentRight = getValues('rightText');
    setValue('leftText', currentRight, { shouldDirty: true });
    setValue('rightText', currentLeft, { shouldDirty: true });
    setLeftFileName(rightFileName);
    setRightFileName(leftFileName);
    diffMutation.reset();
  }

  async function handleFileImport(side: 'left' | 'right', event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const content = await readFileAsText(file);
    const label = `${file.name} (${formatFileSize(file.size)})`;

    if (side === 'left') {
      setValue('leftText', content, { shouldDirty: true });
      setLeftFileName(label);
    } else {
      setValue('rightText', content, { shouldDirty: true });
      setRightFileName(label);
    }

    event.target.value = '';
    diffMutation.reset();
  }

  return (
    <div className="space-y-5">
      <form className="space-y-4" onSubmit={handleSubmit(onCompare)}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <div>
            <Controller
              name="leftText"
              control={control}
              render={({ field }) => (
                <DiffEditorPanel
                  title="Original"
                  badge="A"
                  fileName={leftFileName}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  onImport={() => leftFileInputRef.current?.click()}
                  onClear={() => {
                    setLeftFileName(null);
                    setValue('leftText', '');
                    diffMutation.reset();
                    if (leftFileInputRef.current) {
                      leftFileInputRef.current.value = '';
                    }
                  }}
                  placeholder="Cole ou importe o texto/código de referência..."
                />
              )}
            />
            <input
              ref={leftFileInputRef}
              type="file"
              accept=".txt,.json,.yaml,.yml,.xml,.csv,.md,.html,.css,.js,.ts,.tsx,.jsx,.py,.sql,.sh"
              className="sr-only"
              onChange={(event) => void handleFileImport('left', event)}
            />
          </div>

          <div>
            <Controller
              name="rightText"
              control={control}
              render={({ field }) => (
                <DiffEditorPanel
                  title="Comparação"
                  badge="B"
                  fileName={rightFileName}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  onImport={() => rightFileInputRef.current?.click()}
                  onClear={() => {
                    setRightFileName(null);
                    setValue('rightText', '');
                    diffMutation.reset();
                    if (rightFileInputRef.current) {
                      rightFileInputRef.current.value = '';
                    }
                  }}
                  placeholder="Cole ou importe a versão alterada..."
                />
              )}
            />
            <input
              ref={rightFileInputRef}
              type="file"
              accept=".txt,.json,.yaml,.yml,.xml,.csv,.md,.html,.css,.js,.ts,.tsx,.jsx,.py,.sql,.sh"
              className="sr-only"
              onChange={(event) => void handleFileImport('right', event)}
            />
          </div>
        </div>

        <div className="studio-panel flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)]">
              <input
                type="checkbox"
                className="size-4 rounded"
                {...register('ignoreWhitespace')}
              />
              Ignorar espaços
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)]">
              <input
                type="checkbox"
                className="size-4 rounded"
                {...register('ignoreLineBreaks')}
              />
              Normalizar CRLF/LF
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)]">
              <input
                type="checkbox"
                className="size-4 rounded"
                {...register('ignoreCase')}
              />
              Ignorar maiúsculas
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={!leftText && !rightText}
              onClick={handleSwapSides}
            >
              <ArrowsLeftRight size={15} aria-hidden="true" />
              Inverter A ↔ B
            </Button>

            <Button
              type="submit"
              loading={diffMutation.isPending}
              disabled={!leftText.trim() && !rightText.trim()}
            >
              <GitDiff size={16} aria-hidden="true" />
              Comparar textos
            </Button>
          </div>
        </div>
      </form>

      {activeError && <StudioAlert variant="error">{activeError}</StudioAlert>}

      {result && (
        <StudioPanel
          title="Resultado da comparação"
          badge={
            !result.identical ? (
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                <span className="rounded bg-emerald-500/12 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">
                  +{result.stats.added}
                </span>
                <span className="rounded bg-red-500/12 px-1.5 py-0.5 text-red-700 dark:text-red-300">
                  -{result.stats.removed}
                </span>
                <span className="rounded bg-amber-500/12 px-1.5 py-0.5 text-amber-800 dark:text-amber-300">
                  ~{result.stats.modified}
                </span>
                <span className="rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[var(--ink-muted)]">
                  ={result.stats.unchanged}
                </span>
              </div>
            ) : undefined
          }
          actions={
            !result.identical ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadText(result.html, 'diff.html', 'text/html')}
                >
                  <DownloadSimple size={14} aria-hidden="true" />
                  HTML
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadText(result.unified, 'diff.patch', 'text/plain')}
                >
                  <DownloadSimple size={14} aria-hidden="true" />
                  Patch (.patch)
                </Button>
              </>
            ) : undefined
          }
        >
          <div className="space-y-4">
            {result.identical ? (
              <StudioAlert variant="success" title="Conteúdos equivalentes">
                Nenhuma diferença encontrada com os filtros ativos ({result.stats.unchanged}{' '}
                {result.stats.unchanged === 1 ? 'linha verificada' : 'linhas verificadas'}).
              </StudioAlert>
            ) : (
              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--ink-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-xs bg-red-300 dark:bg-red-800"
                    aria-hidden="true"
                  />
                  Trecho removido
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-xs bg-emerald-300 dark:bg-emerald-800"
                    aria-hidden="true"
                  />
                  Trecho adicionado
                </span>
              </div>
            )}

            <DiffPanel rows={result.rows} />
          </div>
        </StudioPanel>
      )}
    </div>
  );
}
