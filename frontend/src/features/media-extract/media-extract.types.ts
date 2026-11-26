export type MediaPlatform = 'youtube' | 'instagram' | 'tiktok' | 'direct' | 'generic';
export type MediaKind = 'video' | 'audio' | 'image' | 'unknown';
export type MediaExtractMode = 'all' | 'audio';

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

export type AnalyzeMediaRequest = {
  url: string;
  mode?: MediaExtractMode;
};
