import { zodResolver } from '@hookform/resolvers/zod';
import { DownloadSimple, Image, Plus, Swap, Trash, UploadSimple } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { AnimatedSelect } from '../../../components/AnimatedSelect';
import { Button } from '../../../components/Button';
import { StudioAlert, StudioEmptyState, StudioPanel } from '../../../components/PageShell';
import { ProgressBar } from '../../../components/ProgressBar';
import { TOOL_GRID_CLASS } from '../../../layout/content';
import { getErrorMessage } from '../../../lib/errors';
import { ALL_CONVERTER_FILE_ACCEPT, isFileDragEvent } from '../../../lib/file-convert/intake';
import {
  createImageFileEntries,
  formatFileSize,
  IMAGE_FILE_ACCEPT,
  inspectImageFile,
  isSupportedImage,
  OUTPUT_FORMATS,
  OUTPUT_FORMAT_VALUES,
  type ConvertImagesResult,
  type ImageFileEntry,
  type ImageFilePreview,
  type ImageProgressUpdate,
} from '../../../lib/image-convert';
import type { ConverterFileTransfer } from '../../file-convert/components/FileConvertTool';
import { useConvertImageMutation } from '../hooks/useImageConvertMutation';

const formSchema = z.object({
  outputFormat: z.enum(OUTPUT_FORMAT_VALUES),
});

type FormValues = z.infer<typeof formSchema>;

type SelectionState =
  | { mode: 'none' }
  | { mode: 'single'; preview: ImageFilePreview }
  | { mode: 'batch'; items: ImageFileEntry[] };

type ImageConvertToolProps = {
  incomingTransfer?: ConverterFileTransfer | null;
  onConsumeTransfer?: (transferId: number) => void;
  onRouteFiles?: (files: File[]) => void;
  isFrameDragging?: boolean;
};

function SourcePreview({
  preview,
  onRemove,
  onAddMore,
  disabled,
}: {
  preview: ImageFilePreview;
  onRemove: () => void;
  onAddMore: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--ink)]">{preview.file.name}</p>
          <p className="mt-0.5 font-mono text-xs text-[var(--ink-muted)]">
            {formatFileSize(preview.fileSize)} · {preview.width} × {preview.height}px
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

      <img
        src={preview.url}
        alt={`Pré-visualização de ${preview.file.name}`}
        className="max-h-56 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] object-contain p-2"
      />

      <dl className="grid grid-cols-3 gap-2 text-xs">
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
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-2">
          <dt className="text-[10px] text-[var(--ink-muted)]">Resolução</dt>
          <dd className="mt-0.5 truncate font-mono font-medium text-[var(--ink)]">
            {preview.width}×{preview.height}
          </dd>
        </div>
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
  items: ImageFileEntry[];
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
            {items.length} imagens na fila
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

function SingleResultPanel({
  result,
}: {
  result: Extract<ConvertImagesResult, { type: 'single' }>;
}) {
  return (
    <div className="space-y-4">
      <img
        src={result.url}
        alt={`Pré-visualização convertida para ${result.format.toUpperCase()}`}
        className="max-h-64 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] object-contain p-3"
      />

      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
          <dt className="text-[10px] text-[var(--ink-muted)]">Saída</dt>
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
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
          <dt className="text-[10px] text-[var(--ink-muted)]">Resolução</dt>
          <dd className="mt-0.5 truncate font-mono font-medium text-[var(--ink)]">
            {result.width}×{result.height}
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

function BatchResultPanel({
  result,
}: {
  result: Extract<ConvertImagesResult, { type: 'batch' }>;
}) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 gap-2 text-xs">
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
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
          <dt className="text-[10px] text-[var(--ink-muted)]">Formato</dt>
          <dd className="mt-0.5 font-mono font-medium uppercase text-[var(--ink)]">
            {result.format}
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

export function ImageConvertTool({
  incomingTransfer,
  onConsumeTransfer,
  onRouteFiles,
  isFrameDragging = false,
}: ImageConvertToolProps = {}) {
  const convertMutation = useConvertImageMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<SelectionState>({ mode: 'none' });
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isLoadingSelection, setIsLoadingSelection] = useState(false);
  const [isLocalDragging, setIsLocalDragging] = useState(false);
  const [progress, setProgress] = useState<ImageProgressUpdate | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const progressClearTimerRef = useRef<number | null>(null);
  const lastTransferIdRef = useRef<number | null>(null);
  const applyIncomingFilesRef = useRef<
    (incoming: File[], options?: { replace?: boolean }) => Promise<void>
  >(async () => {});

  const isDragging = isFrameDragging || isLocalDragging;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      outputFormat: 'png',
    },
  });

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
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
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

  function revokePreviewUrl() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  function revokeResultUrl() {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }

  function clearSelectionState() {
    revokePreviewUrl();
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

  async function loadSinglePreview(file: File) {
    setIsLoadingSelection(true);
    setSelectionError(null);
    setProgress(null);

    try {
      const preview = await inspectImageFile(file, {
        onProgress: handleProgress,
      });
      revokePreviewUrl();
      previewUrlRef.current = preview.url;
      setSelection({ mode: 'single', preview });
      scheduleProgressClear();
    } catch (error) {
      revokePreviewUrl();
      setSelection({ mode: 'none' });
      setSelectionError(getErrorMessage(error));
      setProgress(null);
    } finally {
      setIsLoadingSelection(false);
    }
  }

  function validateIncomingFiles(files: File[]): File[] {
    const unsupported = files.filter((file) => !isSupportedImage(file));
    if (unsupported.length > 0) {
      throw new Error(
        `"${unsupported[0].name}" não é uma imagem suportada. Use PNG, JPG, WebP, AVIF, BMP, GIF, SVG, HEIC/HEIF ou câmeras RAW.`,
      );
    }
    return files;
  }

  async function applyIncomingFiles(incoming: File[], options?: { replace?: boolean }) {
    if (incoming.length === 0) {
      return;
    }

    convertMutation.reset();
    setSelectionError(null);
    setProgress(null);
    revokeResultUrl();

    if (progressClearTimerRef.current !== null) {
      window.clearTimeout(progressClearTimerRef.current);
      progressClearTimerRef.current = null;
    }

    try {
      const baseFiles = options?.replace ? [] : collectExistingFiles();
      const merged = validateIncomingFiles([...baseFiles, ...incoming]);

      if (merged.length === 1) {
        await loadSinglePreview(merged[0]);
        return;
      }

      revokePreviewUrl();
      setSelection({ mode: 'batch', items: createImageFileEntries(merged) });
      setIsLoadingSelection(false);
    } catch (error) {
      setSelectionError(getErrorMessage(error));
      setIsLoadingSelection(false);
    }
  }

  applyIncomingFilesRef.current = applyIncomingFiles;

  useEffect(() => {
    if (!incomingTransfer || incomingTransfer.targetMode !== 'images') {
      return;
    }
    if (lastTransferIdRef.current === incomingTransfer.id) {
      return;
    }
    lastTransferIdRef.current = incomingTransfer.id;
    onConsumeTransfer?.(incomingTransfer.id);
    void applyIncomingFilesRef.current(incomingTransfer.files, {
      replace: incomingTransfer.replace,
    });
  }, [incomingTransfer, onConsumeTransfer]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (incoming.length === 0) {
      return;
    }
    if (onRouteFiles) {
      onRouteFiles(incoming);
      return;
    }
    await applyIncomingFiles(incoming);
  }

  function handleStandaloneDragOver(event: DragEvent<HTMLLabelElement>) {
    if (onRouteFiles || !isFileDragEvent(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsLocalDragging(true);
  }

  function handleStandaloneDragLeave(event: DragEvent<HTMLLabelElement>) {
    if (onRouteFiles) {
      return;
    }
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsLocalDragging(false);
    }
  }

  function handleStandaloneDrop(event: DragEvent<HTMLLabelElement>) {
    if (onRouteFiles || !isFileDragEvent(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    setIsLocalDragging(false);
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

    revokeResultUrl();
    setProgress(null);

    try {
      const converted = await convertMutation.mutateAsync({
        files: selectedFiles,
        outputFormat: values.outputFormat,
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
      <StudioPanel title="Arquivos de imagem">
        <form className="space-y-5" onSubmit={handleSubmit(onConvert)}>
          <div className="space-y-3">
            {selection.mode === 'none' && !isLoadingSelection && (
              <label
                htmlFor="image-convert-input"
                data-dragging={isDragging ? 'true' : 'false'}
                onDragOver={handleStandaloneDragOver}
                onDragLeave={handleStandaloneDragLeave}
                onDrop={handleStandaloneDrop}
                className={`converter-drop-zone flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-7 text-center ${
                  isDragging
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border-strong)] bg-[var(--bg-subtle)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-panel)]'
                }`}
              >
                <span className="pointer-events-none inline-flex size-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--accent)]">
                  <UploadSimple size={20} weight="duotone" aria-hidden="true" />
                </span>
                <span className="pointer-events-none mt-3 text-sm font-semibold text-[var(--ink)]">
                  Arraste arquivos ou clique para selecionar
                </span>
                <span className="pointer-events-none mt-1 max-w-sm text-xs leading-relaxed text-[var(--ink-muted)]">
                  PNG, JPG, WebP, AVIF, BMP, GIF, SVG, HEIC/HEIF e câmeras RAW — PDF e documentos
                  alternam o modo automaticamente
                </span>
              </label>
            )}

            <input
              id="image-convert-input"
              ref={fileInputRef}
              type="file"
              accept={onRouteFiles ? ALL_CONVERTER_FILE_ACCEPT : IMAGE_FILE_ACCEPT}
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
                  isBatchSelection
                    ? 'Múltiplas imagens são exportadas em um pacote ZIP único.'
                    : 'Preserva resolução original na máxima fidelidade suportada.'
                }
                error={errors.outputFormat?.message}
                options={OUTPUT_FORMATS.map((format) => ({
                  value: format.value,
                  label: format.label,
                }))}
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
            disabled={!hasSelection || isLoadingSelection}
          >
            <Swap size={16} aria-hidden="true" />
            {isBatchSelection
              ? `Converter ${selectedFiles.length} imagens`
              : 'Converter imagem'}
          </Button>
        </form>
      </StudioPanel>

      <div className="lg:sticky lg:top-[calc(var(--topbar-height)+1.25rem)] lg:self-start">
        <StudioPanel title="Arquivo convertido">
          <div className="space-y-4">
            {!result && !activeError && !convertMutation.isPending && (
              <StudioEmptyState
                icon={Image}
                title="Sem conversão processada"
                description="Importe uma ou várias imagens ao lado e escolha o formato final para baixar."
              />
            )}

            {progress && convertMutation.isPending && (
              <ProgressBar value={progress.value} label={progress.label} />
            )}

            {activeError && <StudioAlert variant="error">{activeError}</StudioAlert>}

            {result?.type === 'single' && <SingleResultPanel result={result} />}
            {result?.type === 'batch' && <BatchResultPanel result={result} />}
          </div>
        </StudioPanel>
      </div>
    </div>
  );
}
