import { zodResolver } from '@hookform/resolvers/zod';
import { DownloadSimple, File, Plus, Swap, Trash, UploadSimple } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { AnimatedSelect } from '../../../components/AnimatedSelect';
import { Button } from '../../../components/Button';
import { StudioAlert, StudioEmptyState, StudioPanel } from '../../../components/PageShell';
import { ProgressBar } from '../../../components/ProgressBar';
import { TOOL_GRID_CLASS } from '../../../layout/content';
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
import { getErrorMessage } from '../../../lib/errors';
import { formatFileSize } from '../../../lib/image-convert';
import type { ImageProgressUpdate } from '../../../lib/image-convert/progress';
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

function SourcePreview({
  preview,
  onRemove,
  onAddMore,
  disabled,
}: {
  preview: DocumentFilePreview;
  onRemove: () => void;
  onAddMore: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--ink)]">{preview.file.name}</p>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            {getDocumentSelectionHint(preview.format)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onAddMore}>
            <Plus size={13} aria-hidden="true" />
            Adicionar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onRemove}
            aria-label={`Remover ${preview.file.name}`}
          >
            <Trash size={13} aria-hidden="true" />
            Remover
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-2">
          <dt className="text-[10px] text-[var(--ink-muted)]">Formato</dt>
          <dd className="mt-0.5 font-mono font-medium uppercase text-[var(--ink)]">
            {preview.format}
          </dd>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-2">
          <dt className="text-[10px] text-[var(--ink-muted)]">Tamanho</dt>
          <dd className="mt-0.5 font-mono font-medium text-[var(--ink)]">
            {formatFileSize(preview.fileSize)}
          </dd>
        </div>
        {preview.pageCount !== undefined && (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-2">
            <dt className="text-[10px] text-[var(--ink-muted)]">Páginas</dt>
            <dd className="mt-0.5 font-mono font-medium text-[var(--ink)]">{preview.pageCount}</dd>
          </div>
        )}
        {preview.sheetCount !== undefined && (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-2">
            <dt className="text-[10px] text-[var(--ink-muted)]">Planilhas</dt>
            <dd className="mt-0.5 font-mono font-medium text-[var(--ink)]">
              {preview.sheetCount}
            </dd>
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
    <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">
            {items.length} documentos na fila
          </p>
          <p className="mt-0.5 font-mono text-xs text-[var(--ink-muted)]">
            Total: {formatFileSize(totalSize)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" variant="ghost" size="sm" onClick={onAddMore} disabled={disabled}>
            <Plus size={13} aria-hidden="true" />
            Adicionar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClearAll} disabled={disabled}>
            <Trash size={13} aria-hidden="true" />
            Limpar fila
          </Button>
        </div>
      </div>

      <ul className="max-h-60 divide-y divide-[var(--border-subtle)] overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[var(--ink)] sm:text-sm">
                {item.file.name}
              </p>
              <p className="mt-0.5 font-mono text-[11px] uppercase text-[var(--ink-muted)]">
                {item.format} · {formatFileSize(item.fileSize)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={disabled}
              aria-label={`Remover ${item.file.name}`}
              className="focus-ring inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-subtle)] text-[var(--ink-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--ink)] disabled:opacity-40"
            >
              <Trash size={14} aria-hidden="true" />
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
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
            <dt className="text-[10px] text-[var(--ink-muted)]">Formato gerado</dt>
            <dd className="mt-0.5 font-mono font-medium uppercase text-[var(--ink)]">
              {result.format}
            </dd>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
            <dt className="text-[10px] text-[var(--ink-muted)]">Tamanho</dt>
            <dd className="mt-0.5 font-mono font-medium text-[var(--ink)]">
              {formatFileSize(result.size)}
            </dd>
          </div>
        </dl>

        <a
          href={result.url}
          download={result.fileName}
          className="focus-ring inline-flex min-h-10.5 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.985]"
        >
          <DownloadSimple size={16} aria-hidden="true" />
          Baixar {result.fileName}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
          <dt className="text-[10px] text-[var(--ink-muted)]">Convertidos</dt>
          <dd className="mt-0.5 font-mono font-medium text-[var(--ink)]">{result.successCount}</dd>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
          <dt className="text-[10px] text-[var(--ink-muted)]">Pacote ZIP</dt>
          <dd className="mt-0.5 font-mono font-medium text-[var(--ink)]">
            {formatFileSize(result.size)}
          </dd>
        </div>
      </dl>

      <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
        <p className="border-b border-[var(--border-subtle)] px-3.5 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
          Arquivos no ZIP
        </p>
        <ul className="max-h-56 divide-y divide-[var(--border-subtle)] overflow-y-auto">
          {result.items.map((item) => (
            <li
              key={item.fileName}
              className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs"
            >
              <span className="truncate font-mono text-[var(--ink)]">{item.fileName}</span>
              <span className="shrink-0 font-mono text-[var(--ink-muted)]">
                {formatFileSize(item.size)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {result.failed.length > 0 && (
        <StudioAlert
          variant="warning"
          title={`${result.failed.length} arquivo(s) não convertido(s)`}
        >
          <ul className="mt-1 space-y-1">
            {result.failed.map((item) => (
              <li key={item.fileName}>
                {item.fileName}: {item.error}
              </li>
            ))}
          </ul>
        </StudioAlert>
      )}

      <a
        href={result.url}
        download={result.fileName}
        className="focus-ring inline-flex min-h-10.5 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.985]"
      >
        <DownloadSimple size={16} aria-hidden="true" />
        Baixar pacote ZIP ({result.fileName})
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
  const [isDragging, setIsDragging] = useState(false);
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
        `"${unsupported[0].name}" não é suportado. Use PDF, DOCX, ODT, RTF, TXT, Markdown, HTML, XLSX, CSV, JSON ou XML.`,
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

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(event.dataTransfer.files ?? []);
    void applyIncomingFiles(dropped);
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
      <StudioPanel title="Arquivos de documento">
        <form className="space-y-5" onSubmit={handleSubmit(onConvert)}>
          <div className="space-y-3">
            {selection.mode === 'none' && !isLoadingSelection && (
              <label
                htmlFor="document-convert-input"
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-7 text-center transition-colors duration-150 ${
                  isDragging
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border-strong)] bg-[var(--bg-subtle)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-panel)]'
                }`}
              >
                <span className="inline-flex size-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--accent)]">
                  <UploadSimple size={20} weight="duotone" aria-hidden="true" />
                </span>
                <span className="mt-3 text-sm font-semibold text-[var(--ink)]">
                  Arraste documentos ou clique para selecionar
                </span>
                <span className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--ink-muted)]">
                  PDF, Word (.docx), ODT, RTF, TXT, Markdown, HTML, XLSX, CSV, JSON e XML
                </span>
              </label>
            )}

            <input
              id="document-convert-input"
              ref={fileInputRef}
              type="file"
              accept={DOCUMENT_FILE_ACCEPT}
              multiple
              onChange={(event) => void handleFileChange(event)}
              className="sr-only"
            />

            {progress && isLoadingSelection && (
              <ProgressBar value={progress.value} label={progress.label} />
            )}

            {selectionError && <StudioAlert variant="error">{selectionError}</StudioAlert>}

            {selection.mode === 'single' && !isLoadingSelection && (
              <SourcePreview
                preview={selection.preview}
                onRemove={clearSelectionState}
                onAddMore={handleAddMoreFiles}
                disabled={convertMutation.isPending}
              />
            )}

            {selection.mode === 'batch' && (
              <SourceFileList
                items={selection.items}
                onRemove={(id) => void handleRemoveBatchItem(id)}
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
                label="Formato de destino"
                hint={
                  hasSelection
                    ? 'Exibindo formatos compatíveis com a seleção atual.'
                    : 'PDF, Word (.docx), HTML, Markdown, TXT, XLSX, CSV, JSON, XML ou páginas em imagem.'
                }
                error={errors.outputFormat?.message}
                disabled={hasSelection && availableFormats.length === 0}
                options={(hasSelection ? availableFormats : DOCUMENT_OUTPUT_FORMATS).map(
                  (format) => ({
                    value: format.value,
                    label: format.label,
                  }),
                )}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

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
      </StudioPanel>

      <div className="lg:sticky lg:top-[calc(var(--topbar-height)+1.25rem)] lg:self-start">
        <StudioPanel title="Arquivo convertido">
          <div className="space-y-4">
            {!result && !activeError && !convertMutation.isPending && (
              <StudioEmptyState
                icon={File}
                title="Sem conversão processada"
                description="Importe documentos ou planilhas ao lado e selecione o formato desejado para gerar o arquivo."
              />
            )}

            {progress && convertMutation.isPending && (
              <ProgressBar value={progress.value} label={progress.label} />
            )}

            {activeError && <StudioAlert variant="error">{activeError}</StudioAlert>}

            {result && <ResultPanel result={result} />}
          </div>
        </StudioPanel>
      </div>
    </div>
  );
}
