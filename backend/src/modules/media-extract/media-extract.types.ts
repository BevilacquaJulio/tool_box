import type { Readable } from 'node:stream';

export type MediaPlatform = 'youtube' | 'instagram' | 'tiktok' | 'direct' | 'generic';
export type MediaKind = 'video' | 'audio' | 'image' | 'unknown';
export type MediaExtractMode = 'all' | 'audio';
export type DownloadTokenMode = 'direct' | 'ytdlp' | 'ytdlp-audio' | 'direct-audio';

export type MediaExtractItem = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  mediaType: MediaKind;
  extension?: string;
  resolution?: string;
  bitrateLabel?: string;
  durationSeconds?: number;
  sizeBytes?: number;
  sizeLabel?: string;
  downloadable: boolean;
  restrictionReason?: string;
  originalUrl: string;
  openUrl: string;
  downloadToken?: string;
};

export type MediaExtractResult = {
  sourceUrl: string;
  platform: MediaPlatform;
  mode: MediaExtractMode;
  pageTitle?: string;
  items: MediaExtractItem[];
};

export type DownloadTokenPayload = {
  mode: DownloadTokenMode;
  url: string;
  filename: string;
  formatId?: string;
  contentType?: string;
  exp: number;
};

export type DownloadResult = {
  stream: Readable;
  contentType: string;
  filename: string;
  contentLength?: number;
  abort?: () => void;
};

export type YtdlpFormat = {
  format_id?: string;
  ext?: string;
  height?: number;
  width?: number;
  abr?: number;
  tbr?: number;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  format_note?: string;
};

export type YtdlpInfo = {
  id?: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  webpage_url?: string;
  url?: string;
  ext?: string;
  width?: number;
  height?: number;
  filesize?: number;
  formats?: YtdlpFormat[];
};

export type RemoteProbeResult = {
  contentType?: string;
  contentLength?: number;
  finalUrl: string;
};

export type OEmbedResponse = {
  title?: string;
  thumbnail_url?: string;
  author_name?: string;
  html?: string;
};

export type YouTubeApiVideoResponse = {
  items?: Array<{
    snippet?: {
      title?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
      };
    };
    contentDetails?: {
      duration?: string;
    };
  }>;
};
