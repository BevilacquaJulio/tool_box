import { zodResolver } from '@hookform/resolvers/zod';
import { FilmStrip, MagnifyingGlass, MusicNote } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { StudioAlert, StudioEmptyState, StudioPanel } from '../../../components/PageShell';
import { ProgressBar } from '../../../components/ProgressBar';
import { useSimulatedProgress } from '../../../hooks/useSimulatedProgress';
import { TOOL_GRID_CLASS } from '../../../layout/content';
import { getErrorMessage } from '../../../lib/errors';
import { getPlatformLabel, MEDIA_ANALYZE_STAGES } from '../../../lib/media-extract/format';
import { useAnalyzeMediaUrlMutation } from '../hooks/useMediaExtractMutation';
import type { MediaExtractMode } from '../media-extract.types';
import { MediaItemCard } from './MediaItemCard';

const analyzeSchema = z.object({
  url: z.string().trim().min(1, 'Informe uma URL válida.'),
});

type AnalyzeFormValues = z.infer<typeof analyzeSchema>;

const SUPPORTED_SOURCES = ['YouTube', 'Instagram', 'TikTok', 'MP4 / MP3 / Imagem'];

const EXTRACT_MODES: Array<{
  value: MediaExtractMode;
  label: string;
  description: string;
}> = [
  {
    value: 'all',
    label: 'Vídeo e áudio',
    description: 'Vídeo, faixa de áudio e miniatura',
  },
  {
    value: 'audio',
    label: 'Somente áudio',
    description: 'Extrai apenas a faixa de áudio (MP3/M4A)',
  },
];

export function MediaExtractTool() {
  const mutation = useAnalyzeMediaUrlMutation();
  const resultRef = useRef<HTMLDivElement>(null);
  const [extractMode, setExtractMode] = useState<MediaExtractMode>('all');

  const progress = useSimulatedProgress({
    isPending: mutation.isPending,
    isError: mutation.isError,
    stages: MEDIA_ANALYZE_STAGES,
    completeLabel: 'Análise concluída',
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AnalyzeFormValues>({
    resolver: zodResolver(analyzeSchema),
    defaultValues: { url: '' },
  });

  const currentUrl = watch('url');
  const result = mutation.data;

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [result]);

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({ url: values.url, mode: extractMode });
  });

  function handleModeSelect(nextMode: MediaExtractMode) {
    setExtractMode(nextMode);
    if (result && result.mode !== nextMode && currentUrl.trim().length > 0 && !mutation.isPending) {
      mutation.mutate({ url: currentUrl.trim(), mode: nextMode });
    }
  }

  function handleClear() {
    setValue('url', '', { shouldValidate: false });
    mutation.reset();
  }

  return (
    <div className={TOOL_GRID_CLASS}>
      <StudioPanel
        title="URL da mídia"
        subtitle="Análise e download temporário por token assinado"
      >
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Input
            label="Link público"
            placeholder="https://www.youtube.com/watch?v=..."
            autoComplete="url"
            spellCheck={false}
            error={errors.url?.message}
            labelTrailing={
              currentUrl.trim().length > 0 ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="cursor-pointer font-mono text-[10px] text-[var(--accent)] hover:underline"
                >
                  limpar
                </button>
              ) : undefined
            }
            {...register('url')}
          />

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-[var(--ink-secondary)]">
              O que extrair
            </span>
            <div
              role="radiogroup"
              aria-label="Modo de extração de mídia"
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {EXTRACT_MODES.map((option) => {
                const isActive = extractMode === option.value;
                const Icon = option.value === 'audio' ? MusicNote : FilmStrip;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    disabled={mutation.isPending}
                    onClick={() => handleModeSelect(option.value)}
                    className={`focus-ring flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${
                      isActive
                        ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--ink)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <span
                      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg border ${
                        isActive
                          ? 'border-[var(--accent-border)] bg-[var(--bg-panel)] text-[var(--accent)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--ink-muted)]'
                      }`}
                    >
                      <Icon size={16} weight="duotone" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold">{option.label}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--ink-muted)]">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {SUPPORTED_SOURCES.map((source) => (
              <span
                key={source}
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]"
              >
                {source}
              </span>
            ))}
          </div>

          <Button type="submit" fullWidth loading={mutation.isPending}>
            {extractMode === 'audio' ? (
              <MusicNote size={16} aria-hidden="true" />
            ) : (
              <MagnifyingGlass size={16} aria-hidden="true" />
            )}
            {mutation.isPending
              ? 'Analisando URL...'
              : extractMode === 'audio'
                ? 'Extrair somente áudio'
                : 'Analisar URL'}
          </Button>

          {progress && <ProgressBar value={progress.value} label={progress.label} />}

          {mutation.isError && (
            <StudioAlert variant="error">{getErrorMessage(mutation.error)}</StudioAlert>
          )}

          <StudioAlert variant="info" title="Escopo e privacidade">
            A extração usa <span className="font-mono">yt-dlp</span> e verificação SSRF na API
            interna somente para mídias públicas ou links diretos. Conteúdos privados, pagos ou
            protegidos por login não são suportados.
          </StudioAlert>
        </form>
      </StudioPanel>

      <div
        ref={resultRef}
        className="lg:sticky lg:top-[calc(var(--topbar-height)+1.25rem)] lg:self-start"
      >
        <StudioPanel
          title={extractMode === 'audio' ? 'Áudio extraído' : 'Mídias encontradas'}
          badge={
            result ? (
              <span className="rounded-md border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--accent)]">
                {getPlatformLabel(result.platform)}
              </span>
            ) : undefined
          }
        >
          {!result ? (
            <StudioEmptyState
              icon={extractMode === 'audio' ? MusicNote : FilmStrip}
              title="Nenhuma URL analisada"
              description={
                extractMode === 'audio'
                  ? 'Cole o link público ao lado para extrair apenas a faixa de áudio pronta para download.'
                  : 'Cole o link público ao lado para inspecionar título, miniatura, resolução, áudio e gerar o download.'
              }
            />
          ) : (
            <div className="space-y-4">
              {result.pageTitle && (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                    Origem identificada · {result.items.length}{' '}
                    {result.items.length === 1 ? 'item' : 'itens'}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-[var(--ink)]">
                    {result.pageTitle}
                  </p>
                </div>
              )}

              {result.items.length === 0 ? (
                <StudioEmptyState
                  icon={extractMode === 'audio' ? MusicNote : FilmStrip}
                  title="Nenhum item disponível"
                  description="Não foram encontrados arquivos de mídia para esta URL."
                />
              ) : (
                <div className="space-y-3">
                  {result.items.map((item) => (
                    <MediaItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </StudioPanel>
      </div>
    </div>
  );
}
