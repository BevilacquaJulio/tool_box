export type MediaPlatform = 'youtube' | 'instagram' | 'tiktok' | 'direct' | 'generic';
export type MediaKind = 'video' | 'audio' | 'image' | 'unknown';

export type MediaExtractItem = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  mediaType: MediaKind;
  extension?: string;
  resolution?: string;
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
  pageTitle?: string;
  items: MediaExtractItem[];
};

export type AnalyzeMediaRequest = {
  url: string;
};
