import { zodResolver } from '@hookform/resolvers/zod';
import { DownloadSimple, File, Plus, Swap, Trash } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { AnimatedSelect } from '../../../components/AnimatedSelect';
import { Button } from '../../../components/Button';
import { ProgressBar } from '../../../components/ProgressBar';
import { getErrorMessage } from '../../../lib/errors';
import {
  createDocumentFileEntries,
  DOCUMENT_FILE_ACCEPT,
  DOCUMENT_OUTPUT_FORMATS,
  DOCUMENT_OUTPUT_FORMAT_VALUES,
  getDocumentSelectionHint,
  inspectDocumentFile,
  isSupportedDocument,
  type ConvertDocumentsResult,
  type DocumentFileEntry,
  type DocumentFilePreview,
  type DocumentOutputFormat,
} from '../../../lib/document-convert';
import { formatFileSize } from '../../../lib/image-convert';
import type { ImageProgressUpdate } from '../../../lib/image-convert/progress';
import { TOOL_GRID_CLASS } from '../../../layout/content';
import { useConvertDocumentsMutation } from '../hooks/useDocumentConvertMutation';

type SelectionState =
  | { mode: 'none' }
  | { mode: 'single'; preview: DocumentFilePreview }
  | { mode: 'batch'; items: DocumentFileEntry[] };

function getAvailableOutputFormats(items: DocumentFileEntry[]) {
  if (items.length === 0) {
    return [...DOCUMENT_OUTPUT_FORMATS];
  }

  const kinds = items.map((item) => item.format);
  return DOCUMENT_OUTPUT_FORMATS.filter((format) =>
    kinds.every((kind) => format.supports.includes(kind)),
  );
}

const formSchema = z.object({
  outputFormat: z.enum(DOCUMENT_OUTPUT_FORMAT_VALUES),
});

type FormValues = z.infer<typeof formSchema>;

function ResultsEmptyState() {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center sm:min-h-[16rem] dark:border-zinc-700">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nenhuma conversão ainda</p>
      <p className="mt-1 max-w-[32ch] text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Envie um ou mais documentos e escolha o formato de saída.
      </p>
    </div>
  );
}

function SourcePreview({
  preview,
  onRemove,
  disabled,
}: {
  preview: DocumentFilePreview;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {preview.file.name}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {getDocumentSelectionHint(preview.format)}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remover ${preview.file.name}`}
          className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <Trash size={14} aria-hidden="true" />
          Remover
        </button>
      </div>

      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">Tipo</dt>
          <dd className="font-mono uppercase text-zinc-950 dark:text-zinc-50">{preview.format}</dd>
        </div>
        <div className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">Arquivo</dt>
          <dd className="font-mono text-zinc-950 dark:text-zinc-50">
            {formatFileSize(preview.fileSize)}
          </dd>
        </div>
        {preview.pageCount !== undefined && (
          <div className="rounded-md border border-zinc-200 px-3 py-2 sm:col-span-2 dark:border-zinc-800">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Páginas</dt>
            <dd className="font-mono text-zinc-950 dark:text-zinc-50">{preview.pageCount}</dd>
          </div>
        )}
        {preview.sheetCount !== undefined && (
          <div className="rounded-md border border-zinc-200 px-3 py-2 sm:col-span-2 dark:border-zinc-800">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Planilhas</dt>
            <dd className="font-mono text-zinc-950 dark:text-zinc-50">{preview.sheetCount}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function SourceFileList({
  items,
  onRemove,
  onAddMore,
  onClearAll,
  disabled,
}: {
  items: DocumentFileEntry[];
  onRemove: (id: string) => void;
  onAddMore: () => void;
  onClearAll: () => void;
  disabled?: boolean;
}) {
  const totalSize = items.reduce((sum, item) => sum + item.fileSize, 0);

  return (
    <div className="space-y-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {items.length} documentos selecionados
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Total: {formatFileSize(totalSize)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAddMore}
            disabled={disabled}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <Plus size={14} aria-hidden="true" />
            Adicionar mais
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={disabled}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <Trash size={14} aria-hidden="true" />
            Limpar tudo
          </button>
        </div>
      </div>

      <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-zinc-800 dark:text-zinc-200">{item.file.name}</p>
              <p className="mt-0.5 font-mono text-xs uppercase text-zinc-500 dark:text-zinc-400">
                {item.format} · {formatFileSize(item.fileSize)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={disabled}
              aria-label={`Remover ${item.file.name}`}
              className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <Trash size={14} aria-hidden="true" />
              Remover
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultPanel({ result }: { result: ConvertDocumentsResult }) {
  if (result.type === 'single') {
    return (
      <div className="space-y-4 rounded-md border border-zinc-200 p-4 sm:p-5 dark:border-zinc-800">
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Formato</dt>
            <dd className="font-mono uppercase text-zinc-950 dark:text-zinc-50">{result.format}</dd>
          </div>
          <div className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Tamanho</dt>
            <dd className="font-mono text-zinc-950 dark:text-zinc-50">{formatFileSize(result.size)}</dd>
          </div>
        </dl>

        <a
          href={result.url}
          download={result.fileName}
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-950 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 ease-out hover:bg-zinc-800 active:scale-[0.97] dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 sm:min-h-0"
        >
          <DownloadSimple size={16} aria-hidden="true" />
          Baixar {result.fileName}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border border-zinc-200 p-4 sm:p-5 dark:border-zinc-800">
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">Arquivos convertidos</dt>
          <dd className="font-mono text-zinc-950 dark:text-zinc-50">{result.successCount}</dd>
        </div>
        <div className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">Tamanho do ZIP</dt>
          <dd className="font-mono text-zinc-950 dark:text-zinc-50">{formatFileSize(result.size)}</dd>
        </div>
      </dl>

      <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
        <p className="border-b border-zinc-200 px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Conteúdo do ZIP
        </p>
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {result.items.map((item) => (
            <li
              key={item.fileName}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm sm:px-4"
            >
              <span className="truncate font-mono text-zinc-800 dark:text-zinc-200">{item.fileName}</span>
              <span className="shrink-0 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {formatFileSize(item.size)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {result.failed.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-zinc-400 bg-zinc-100 px-3 py-2.5 text-sm leading-relaxed text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <p className="font-medium">{result.failed.length} arquivo(s) não convertido(s):</p>
          <ul className="mt-2 space-y-1 text-xs">
            {result.failed.map((item) => (
              <li key={item.fileName}>
                {item.fileName}: {item.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <a
        href={result.url}
        download={result.fileName}
        className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-950 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 ease-out hover:bg-zinc-800 active:scale-[0.97] dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 sm:min-h-0"
      >
        <DownloadSimple size={16} aria-hidden="true" />
        Baixar pasta ZIP ({result.fileName})
      </a>
    </div>
  );
}

export function DocumentConvertTool() {
  const convertMutation = useConvertDocumentsMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<SelectionState>({ mode: 'none' });
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isLoadingSelection, setIsLoadingSelection] = useState(false);
  const [progress, setProgress] = useState<ImageProgressUpdate | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const progressClearTimerRef = useRef<number | null>(null);

  const selectedEntries =
    selection.mode === 'single'
      ? [createDocumentFileEntries([selection.preview.file])[0]]
      : selection.mode === 'batch'
        ? selection.items
        : [];

  const availableFormats = useMemo(
    () => getAvailableOutputFormats(selectedEntries),
    [selectedEntries],
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      outputFormat: 'txt',
    },
  });

  const selectedOutputFormat = watch('outputFormat');

  useEffect(() => {
    if (availableFormats.length === 0) {
      return;
    }

    if (!availableFormats.some((format) => format.value === selectedOutputFormat)) {
      reset({ outputFormat: availableFormats[0].value });
    }
  }, [availableFormats, reset, selectedOutputFormat]);

  const result = convertMutation.data;
  const activeError = convertMutation.error ? getErrorMessage(convertMutation.error) : null;
  const selectedFiles =
    selection.mode === 'single'
      ? [selection.preview.file]
      : selection.mode === 'batch'
        ? selection.items.map((item) => item.file)
        : [];
  const hasSelection = selectedFiles.length > 0;
  const isBatchSelection = selection.mode === 'batch';

  useEffect(() => {
    return () => {
      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current);
      }
      if (progressClearTimerRef.current !== null) {
        window.clearTimeout(progressClearTimerRef.current);
      }
    };
  }, []);

  function handleProgress(update: ImageProgressUpdate) {
    if (progressClearTimerRef.current !== null) {
      window.clearTimeout(progressClearTimerRef.current);
      progressClearTimerRef.current = null;
    }
    setProgress(update);
  }

  function scheduleProgressClear() {
    if (progressClearTimerRef.current !== null) {
      window.clearTimeout(progressClearTimerRef.current);
    }

    progressClearTimerRef.current = window.setTimeout(() => {
      setProgress(null);
      progressClearTimerRef.current = null;
    }, 500);
  }

  function revokeResultUrl() {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }

  function clearSelectionState() {
    revokeResultUrl();

    if (progressClearTimerRef.current !== null) {
      window.clearTimeout(progressClearTimerRef.current);
      progressClearTimerRef.current = null;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setSelection({ mode: 'none' });
    setSelectionError(null);
    setProgress(null);
    convertMutation.reset();
  }

  function collectExistingFiles(): File[] {
    if (selection.mode === 'single') {
      return [selection.preview.file];
    }

    if (selection.mode === 'batch') {
      return selection.items.map((item) => item.file);
    }

    return [];
  }

  function validateIncomingFiles(files: File[]): File[] {
    const unsupported = files.filter((file) => !isSupportedDocument(file));
    if (unsupported.length > 0) {
      throw new Error(
        `"${unsupported[0].name}" ainda não é suportado. Use PDF, DOCX, TXT, Markdown, HTML, XLSX, CSV, JSON ou XML.`,
      );
    }
    return files;
  }

  async function loadSinglePreview(file: File) {
    setIsLoadingSelection(true);
    setSelectionError(null);
    setProgress(null);

    try {
      const preview = await inspectDocumentFile(file);
      setSelection({ mode: 'single', preview });
    } catch (error) {
      setSelection({ mode: 'none' });
      setSelectionError(getErrorMessage(error));
      setProgress(null);
    } finally {
      setIsLoadingSelection(false);
    }
  }

  async function applyIncomingFiles(incoming: File[]) {
    if (incoming.length === 0) {
      return;
    }

    convertMutation.reset();
    setSelectionError(null);
    setProgress(null);
    revokeResultUrl();

    try {
      const merged = validateIncomingFiles([...collectExistingFiles(), ...incoming]);

      if (merged.length === 1) {
        await loadSinglePreview(merged[0]);
        return;
      }

      setSelection({ mode: 'batch', items: createDocumentFileEntries(merged) });
      setIsLoadingSelection(false);
    } catch (error) {
      setSelectionError(getErrorMessage(error));
      setIsLoadingSelection(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    event.target.value = '';
    await applyIncomingFiles(incoming);
  }

  function handleAddMoreFiles() {
    fileInputRef.current?.click();
  }

  async function handleRemoveBatchItem(id: string) {
    if (selection.mode !== 'batch') {
      return;
    }

    const nextItems = selection.items.filter((item) => item.id !== id);

    if (nextItems.length === 0) {
      clearSelectionState();
      return;
    }

    if (nextItems.length === 1) {
      convertMutation.reset();
      revokeResultUrl();
      await loadSinglePreview(nextItems[0].file);
      return;
    }

    convertMutation.reset();
    revokeResultUrl();
    setSelection({ mode: 'batch', items: nextItems });
  }

  async function onConvert(values: FormValues) {
    if (!hasSelection) {
      return;
    }

    if (!availableFormats.some((format) => format.value === values.outputFormat)) {
      setSelectionError('Escolha um formato de saída compatível com os documentos selecionados.');
      return;
    }

    revokeResultUrl();
    setProgress(null);

    try {
      const converted = await convertMutation.mutateAsync({
        files: selectedFiles,
        outputFormat: values.outputFormat as DocumentOutputFormat,
        onProgress: handleProgress,
      });

      resultUrlRef.current = converted.url;
      scheduleProgressClear();
    } catch {
      setProgress(null);
    }
  }

  return (
    <div className={TOOL_GRID_CLASS}>
      <section className="space-y-6">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
          Entrada
        </h2>

        <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit(onConvert)}>
          <div className="space-y-3">
            <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Arquivos de documento
            </span>

            {selection.mode === 'none' && !isLoadingSelection && (
              <label
                htmlFor="document-convert-input"
                className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/50"
              >
                <File size={28} aria-hidden="true" className="text-zinc-500 dark:text-zinc-400" />
                <span className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Clique para escolher um ou mais documentos
                </span>
                <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  PDF, Word (.docx), TXT, Markdown, HTML, XLSX, CSV, JSON e XML
                </span>
              </label>
            )}

            <input
              id="document-convert-input"
              ref={fileInputRef}
              type="file"
              accept={DOCUMENT_FILE_ACCEPT}
              multiple
              onChange={handleFileChange}
              className="sr-only"
            />

            {progress && isLoadingSelection && (
              <ProgressBar value={progress.value} label={progress.label} />
            )}

            {selectionError && (
              <p role="alert" className="text-xs text-zinc-700 dark:text-zinc-300">
                {selectionError}
              </p>
            )}

            {selection.mode === 'single' && !isLoadingSelection && (
              <SourcePreview
                preview={selection.preview}
                onRemove={clearSelectionState}
                disabled={convertMutation.isPending}
              />
            )}

            {selection.mode === 'batch' && (
              <SourceFileList
                items={selection.items}
                onRemove={handleRemoveBatchItem}
                onAddMore={handleAddMoreFiles}
                onClearAll={clearSelectionState}
                disabled={convertMutation.isPending || isLoadingSelection}
              />
            )}
          </div>

          <Controller
            name="outputFormat"
            control={control}
            render={({ field }) => (
              <AnimatedSelect
                label="Converter para"
                hint={
                  hasSelection
                    ? 'Formatos disponiveis para os documentos selecionados.'
                    : 'TXT, HTML, Markdown, CSV, XLSX, JSON, XML e imagens (PDF): escolha antes ou depois de importar.'
                }
                error={errors.outputFormat?.message}
                disabled={hasSelection && availableFormats.length === 0}
                options={(hasSelection ? availableFormats : DOCUMENT_OUTPUT_FORMATS).map((format) => ({
                  value: format.value,
                  label: format.label,
                }))}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {isBatchSelection
              ? 'Vários documentos serão convertidos e entregues em um ZIP para download.'
              : 'PDF, Word, planilhas e dados estruturados podem ser exportados em vários formatos de texto e tabela.'}
          </p>

          <Button
            type="submit"
            fullWidth
            loading={convertMutation.isPending}
            disabled={!hasSelection || isLoadingSelection || availableFormats.length === 0}
          >
            <Swap size={16} aria-hidden="true" />
            {isBatchSelection
              ? `Converter ${selectedFiles.length} documentos`
              : 'Converter documento'}
          </Button>
        </form>
      </section>

      <section className="space-y-4 lg:sticky lg:top-[calc(var(--header-height-compact)+1.5rem)] lg:self-start">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
          Resultado
        </h2>

        {!result && !activeError && !convertMutation.isPending && <ResultsEmptyState />}

        {progress && convertMutation.isPending && (
          <ProgressBar value={progress.value} label={progress.label} />
        )}

        {activeError && (
          <p
            role="alert"
            className="rounded-md border border-zinc-400 bg-zinc-100 px-3 py-2.5 text-sm leading-relaxed text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
          >
            {activeError}
          </p>
        )}

        {result && <ResultPanel result={result} />}
      </section>
    </div>
  );
}
