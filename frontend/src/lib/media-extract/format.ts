import type { MediaKind, MediaPlatform } from '../../features/media-extract/media-extract.types';
import type { SimulatedProgressStage } from '../../hooks/useSimulatedProgress';

export const MEDIA_ANALYZE_STAGES: SimulatedProgressStage[] = [
  { label: 'Validando URL...', from: 5, to: 22, intervalMs: 120 },
  { label: 'Detectando plataforma...', from: 22, to: 42, intervalMs: 140 },
  { label: 'Extraindo metadados da mídia...', from: 42, to: 88, intervalMs: 210 },
  { label: 'Finalizando análise...', from: 88, to: 96, intervalMs: 260 },
];

const PLATFORM_LABELS: Record<MediaPlatform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  direct: 'Arquivo direto',
  generic: 'Link genérico',
};

const MEDIA_KIND_LABELS: Record<MediaKind, string> = {
  video: 'Vídeo',
  audio: 'Áudio',
  image: 'Imagem',
  unknown: 'Mídia',
};

export function getPlatformLabel(platform: MediaPlatform): string {
  return PLATFORM_LABELS[platform];
}

export function getMediaKindLabel(kind: MediaKind): string {
  return MEDIA_KIND_LABELS[kind];
}

export function formatMediaDuration(seconds?: number): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) {
    return null;
  }

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
}
