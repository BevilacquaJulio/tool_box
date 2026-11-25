import { UploadSimple } from '@phosphor-icons/react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { StudioAlert } from '../../../components/PageShell';
import { isFileDragEvent, planConverterIntake } from '../../../lib/file-convert/intake';
import { ImageConvertTool } from '../../image-convert/components/ImageConvertTool';
import { ConvertModeSelector, type ConvertMode } from './ConvertModeSelector';

export type ConverterFileTransfer = {
  id: number;
  targetMode: ConvertMode;
  files: File[];
  replace: boolean;
};

const DocumentConvertTool = lazy(async () => {
  const module = await import('../../document-convert/components/DocumentConvertTool');
  return { default: module.DocumentConvertTool };
});

function ModeLoadingState() {
  return (
    <div className="grid grid-cols-1 gap-5 animate-pulse lg:grid-cols-2">
      <div className="studio-panel h-72 p-5" />
      <div className="studio-panel h-72 p-5" />
    </div>
  );
}

export function FileConvertTool() {
  const [mode, setMode] = useState<ConvertMode>('images');
  const [pendingTransfer, setPendingTransfer] = useState<ConverterFileTransfer | null>(null);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [modeSwitchNotice, setModeSwitchNotice] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);
  const transferSeqRef = useRef(0);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    function resetDragState() {
      dragDepthRef.current = 0;
      setIsDragging(false);
    }

    window.addEventListener('dragend', resetDragState);
    window.addEventListener('drop', resetDragState);
    window.addEventListener('blur', resetDragState);

    return () => {
      window.removeEventListener('dragend', resetDragState);
      window.removeEventListener('drop', resetDragState);
      window.removeEventListener('blur', resetDragState);
    };
  }, [isDragging]);

  const routeIncomingFiles = useCallback(
    (incoming: File[]) => {
      const plan = planConverterIntake(incoming);

      if (plan.status === 'empty') {
        return;
      }

      if (plan.status === 'unsupported' || plan.status === 'mixed') {
        setIntakeError(plan.error);
        setModeSwitchNotice(null);
        return;
      }

      setIntakeError(null);

      const switched = plan.mode !== mode;
      if (switched) {
        const targetLabel =
          plan.mode === 'documents' ? 'Documentos e planilhas' : 'Imagens e RAW';
        const summary =
          plan.files.length === 1 ? plan.files[0].name : `${plan.files.length} arquivos`;
        setMode(plan.mode);
        setModeSwitchNotice(`Modo alternado automaticamente para ${targetLabel} (${summary}).`);
      } else {
        setModeSwitchNotice(null);
      }

      transferSeqRef.current += 1;
      setPendingTransfer({
        id: transferSeqRef.current,
        targetMode: plan.mode,
        files: plan.files,
        replace: switched,
      });
    },
    [mode],
  );

  const handleConsumeTransfer = useCallback((transferId: number) => {
    setPendingTransfer((current) => (current?.id === transferId ? null : current));
  }, []);

  function handleModeChange(nextMode: ConvertMode) {
    setMode(nextMode);
    setIntakeError(null);
    setModeSwitchNotice(null);
    setPendingTransfer(null);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!isFileDragEvent(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!isFileDragEvent(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    if (dragDepthRef.current === 0) {
      dragDepthRef.current = 1;
    }
    if (!isDragging) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!isDragging) {
      return;
    }

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    const nextTarget = event.relatedTarget as Node | null;
    if (
      dragDepthRef.current === 0 ||
      (nextTarget !== null && !event.currentTarget.contains(nextTarget))
    ) {
      dragDepthRef.current = 0;
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!isFileDragEvent(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    const dropped = Array.from(event.dataTransfer.files ?? []);
    routeIncomingFiles(dropped);
  }

  return (
    <div
      data-testid="converter-drop-frame"
      data-dragging={isDragging ? 'true' : 'false'}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="converter-drop-frame space-y-5"
    >
      <ConvertModeSelector value={mode} onChange={handleModeChange} />

      {intakeError && <StudioAlert variant="error">{intakeError}</StudioAlert>}
      {modeSwitchNotice && !intakeError && (
        <StudioAlert variant="info">{modeSwitchNotice}</StudioAlert>
      )}

      {mode === 'images' ? (
        <ImageConvertTool
          incomingTransfer={pendingTransfer}
          onConsumeTransfer={handleConsumeTransfer}
          onRouteFiles={routeIncomingFiles}
          isFrameDragging={isDragging}
        />
      ) : (
        <Suspense fallback={<ModeLoadingState />}>
          <DocumentConvertTool
            incomingTransfer={pendingTransfer}
            onConsumeTransfer={handleConsumeTransfer}
            onRouteFiles={routeIncomingFiles}
            isFrameDragging={isDragging}
          />
        </Suspense>
      )}

      {isDragging && (
        <div
          className="converter-drop-overlay"
          aria-live="polite"
          data-testid="converter-drop-overlay"
        >
          <div className="converter-drop-overlay__card">
            <span className="converter-drop-overlay__icon" aria-hidden="true">
              <UploadSimple size={28} weight="duotone" />
            </span>
            <span className="mt-3.5 inline-flex items-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[var(--accent)]">
              Detecção automática de formato
            </span>
            <p className="mt-2 text-base font-semibold text-[var(--ink)]">
              Solte os arquivos aqui para carregar
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">
              PDF, Word (.docx), planilhas (XLSX, XLS, ODS, CSV, TSV), texto, Markdown, HTML, JSON,
              XML, imagens e câmeras RAW.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
