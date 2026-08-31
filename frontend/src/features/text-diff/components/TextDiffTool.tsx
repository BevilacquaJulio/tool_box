import { CheckCircle, DownloadSimple, GitDiff } from '@phosphor-icons/react';
import { useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../../components/Button';
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

  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
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

    diffMutation.reset();
  }

  return (
    <div className="space-y-6">
      <form className="space-y-6" onSubmit={handleSubmit(onCompare)}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <div>
            <DiffEditorPanel
              title="Texto original"
              fileName={leftFileName}
              onImport={() => leftFileInputRef.current?.click()}
              onClear={() => {
                setLeftFileName(null);
                setValue('leftText', '');
                if (leftFileInputRef.current) {
                  leftFileInputRef.current.value = '';
                }
              }}
              placeholder="Cole ou digite o texto original..."
              {...register('leftText')}
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
            <DiffEditorPanel
              title="Texto de comparação"
              fileName={rightFileName}
              onImport={() => rightFileInputRef.current?.click()}
              onClear={() => {
                setRightFileName(null);
                setValue('rightText', '');
                if (rightFileInputRef.current) {
                  rightFileInputRef.current.value = '';
                }
              }}
              placeholder="Cole ou digite o texto para comparar..."
              {...register('rightText')}
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

        <div className="grid grid-cols-1 gap-5 rounded-md border border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-3">
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
            <input type="checkbox" className="mt-0.5 size-4 rounded border-zinc-300" {...register('ignoreWhitespace')} />
            <span>
              Ignorar espaços
              <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                Remove espaços ao comparar.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
            <input type="checkbox" className="mt-0.5 size-4 rounded border-zinc-300" {...register('ignoreLineBreaks')} />
            <span>
              Normalizar quebras
              <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                Trata CRLF e LF como iguais.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
            <input type="checkbox" className="mt-0.5 size-4 rounded border-zinc-300" {...register('ignoreCase')} />
            <span>
              Ignorar maiúsculas
              <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                Compara sem diferenciar A/a.
              </span>
            </span>
          </label>
        </div>

        <Button
          type="submit"
          fullWidth
          loading={diffMutation.isPending}
          disabled={!leftText.trim() && !rightText.trim()}
        >
          <GitDiff size={16} aria-hidden="true" />
          Comparar textos
        </Button>
      </form>

      {activeError && (
        <p
          role="alert"
          className="rounded-md border border-zinc-400 bg-zinc-100 px-3 py-2.5 text-sm leading-relaxed text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
        >
          {activeError}
        </p>
      )}

      {result && (
        <section className="space-y-4">
          {result.identical ? (
            <div className="flex items-start gap-3 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
              <CheckCircle size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Sem diferenças</p>
                <p className="mt-1 leading-relaxed text-emerald-800 dark:text-emerald-200">
                  Os textos são idênticos com as opções selecionadas ({result.stats.unchanged} linha
                  {result.stats.unchanged === 1 ? '' : 's'} conferida
                  {result.stats.unchanged === 1 ? '' : 's'}).
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
                    Resultado
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {result.stats.added} adicionada(s) · {result.stats.removed} removida(s) ·{' '}
                    {result.stats.modified} modificada(s) · {result.stats.unchanged} igual(is)
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => downloadText(result.html, 'diff.html', 'text/html')}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-950 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 ease-out hover:bg-zinc-800 active:scale-[0.97] dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                  >
                    <DownloadSimple size={16} aria-hidden="true" />
                    Exportar HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadText(result.unified, 'diff.patch', 'text/plain')}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
                  >
                    <DownloadSimple size={16} aria-hidden="true" />
                    Exportar diff
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="inline-flex items-center gap-2">
                  <span className="size-3 rounded-sm bg-red-200 dark:bg-red-900/70" aria-hidden="true" />
                  Caractere removido
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="size-3 rounded-sm bg-emerald-200 dark:bg-emerald-900/70" aria-hidden="true" />
                  Caractere adicionado
                </span>
              </div>
            </>
          )}

          <DiffPanel rows={result.rows} />
        </section>
      )}
    </div>
  );
}
