import {
  ArrowSquareOut,
  DownloadSimple,
  Image as ImageIcon,
  MusicNote,
  VideoCamera,
  WarningCircle,
} from '@phosphor-icons/react';
import { StudioAlert } from '../../../components/PageShell';
import { getMediaDownloadUrl } from '../../../lib/api';
import {
  formatMediaDuration,
  getMediaDownloadLabel,
  getMediaKindLabel,
} from '../../../lib/media-extract/format';
import type { MediaExtractItem } from '../media-extract.types';

type MediaItemCardProps = {
  item: MediaExtractItem;
};

function MediaTypeIcon({
  mediaType,
  size = 16,
}: {
  mediaType: MediaExtractItem['mediaType'];
  size?: number;
}) {
  switch (mediaType) {
    case 'video':
      return <VideoCamera size={size} weight="duotone" aria-hidden="true" />;
    case 'audio':
      return <MusicNote size={size} weight="duotone" aria-hidden="true" />;
    case 'image':
      return <ImageIcon size={size} weight="duotone" aria-hidden="true" />;
    default:
      return <WarningCircle size={size} weight="duotone" aria-hidden="true" />;
  }
}

export function MediaItemCard({ item }: MediaItemCardProps) {
  const duration = formatMediaDuration(item.durationSeconds);
  const kindLabel = getMediaKindLabel(item.mediaType);
  const downloadLabel = getMediaDownloadLabel(item.mediaType);

  return (
    <article className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5 transition-colors duration-150 hover:border-[var(--border-strong)]">
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] sm:w-44">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--accent)]">
              <MediaTypeIcon mediaType={item.mediaType} size={28} />
            </div>
          )}

          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)]/92 px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--ink)] backdrop-blur-xs">
            <span className="text-[var(--accent)]">
              <MediaTypeIcon mediaType={item.mediaType} size={12} />
            </span>
            {kindLabel}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--ink)]">
              {item.title}
            </h3>

            {(item.extension ||
              item.resolution ||
              item.bitrateLabel ||
              duration ||
              item.sizeLabel) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.extension && (
                  <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-0.5 font-mono text-[11px] uppercase text-[var(--ink-secondary)]">
                    .{item.extension}
                  </span>
                )}
                {item.resolution && (
                  <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-secondary)]">
                    {item.resolution}
                  </span>
                )}
                {item.bitrateLabel && (
                  <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-secondary)]">
                    {item.bitrateLabel}
                  </span>
                )}
                {duration && (
                  <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-secondary)]">
                    {duration}
                  </span>
                )}
                {item.sizeLabel && (
                  <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-secondary)]">
                    {item.sizeLabel}
                  </span>
                )}
              </div>
            )}
          </div>

          {!item.downloadable && item.restrictionReason && (
            <StudioAlert variant="warning">{item.restrictionReason}</StudioAlert>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-0.5">
            {item.downloadable && item.downloadToken && (
              <a
                href={getMediaDownloadUrl(item.downloadToken)}
                download
                className="focus-ring inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.985]"
              >
                <DownloadSimple size={15} weight="bold" aria-hidden="true" />
                {downloadLabel}
              </a>
            )}

            <a
              href={item.openUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="focus-ring inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] px-3 py-2 text-xs font-medium text-[var(--ink)] transition-colors hover:border-[var(--accent-border)] hover:bg-[var(--bg-elevated)] active:scale-[0.985]"
            >
              <ArrowSquareOut size={14} aria-hidden="true" />
              Abrir origem
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
