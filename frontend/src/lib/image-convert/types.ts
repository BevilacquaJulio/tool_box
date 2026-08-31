import type { ImageProgressReporter } from './progress';

export type { ImageProgressReporter, ImageProgressUpdate } from './progress';

export const MAX_EXPORT_QUALITY = 1;

export const OUTPUT_FORMATS = [
  {
    value: 'webp',
    label: 'WebP',
    mime: 'image/webp',
    extension: 'webp',
  },
  {
    value: 'png',
    label: 'PNG',
    mime: 'image/png',
    extension: 'png',
  },
  {
    value: 'jpeg',
    label: 'JPEG / JPG',
    mime: 'image/jpeg',
    extension: 'jpg',
  },
  {
    value: 'avif',
    label: 'AVIF',
    mime: 'image/avif',
    extension: 'avif',
  },
  {
    value: 'bmp',
    label: 'BMP',
    mime: 'image/bmp',
    extension: 'bmp',
  },
  {
    value: 'gif',
    label: 'GIF',
    mime: 'image/gif',
    extension: 'gif',
  },
] as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[number]['value'];

export type ConvertImageInput = {
  file: File;
  outputFormat: OutputFormat;
  onProgress?: ImageProgressReporter;
};

export type InspectImageOptions = {
  onProgress?: ImageProgressReporter;
};

export type ConvertImageResult = {
  blob: Blob;
  url: string;
  fileName: string;
  width: number;
  height: number;
  size: number;
  format: OutputFormat;
};

export type ConvertBatchResult = {
  type: 'batch';
  url: string;
  fileName: string;
  size: number;
  format: OutputFormat;
  successCount: number;
  failed: Array<{ fileName: string; error: string }>;
  items: Array<{ fileName: string; size: number }>;
};

export type ConvertImagesResult =
  | ({ type: 'single' } & ConvertImageResult)
  | ConvertBatchResult;

export type ConvertImagesInput = {
  files: File[];
  outputFormat: OutputFormat;
  onProgress?: ImageProgressReporter;
};

export type ImageFilePreview = {
  file: File;
  url: string;
  format: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
};

export const OUTPUT_FORMAT_VALUES = OUTPUT_FORMATS.map((format) => format.value) as [
  OutputFormat,
  ...OutputFormat[],
];
