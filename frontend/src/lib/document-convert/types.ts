import type { ImageProgressReporter } from '../image-convert/progress';

export type DocumentKind =
  | 'pdf'
  | 'docx'
  | 'txt'
  | 'md'
  | 'html'
  | 'xlsx'
  | 'csv'
  | 'json'
  | 'xml'
  | 'unknown';

export const DOCUMENT_OUTPUT_FORMATS = [
  {
    value: 'png',
    label: 'PNG (páginas do PDF)',
    extension: 'png',
    mime: 'image/png',
    supports: ['pdf'] as DocumentKind[],
  },
  {
    value: 'jpeg',
    label: 'JPEG (páginas do PDF)',
    extension: 'jpg',
    mime: 'image/jpeg',
    supports: ['pdf'] as DocumentKind[],
  },
  {
    value: 'txt',
    label: 'Texto (.txt)',
    extension: 'txt',
    mime: 'text/plain',
    supports: ['pdf', 'docx', 'txt', 'md', 'html', 'csv', 'xlsx', 'json', 'xml'] as DocumentKind[],
  },
  {
    value: 'html',
    label: 'HTML (.html)',
    extension: 'html',
    mime: 'text/html',
    supports: ['pdf', 'docx', 'txt', 'md', 'html', 'csv', 'xlsx', 'json', 'xml'] as DocumentKind[],
  },
  {
    value: 'md',
    label: 'Markdown (.md)',
    extension: 'md',
    mime: 'text/markdown',
    supports: ['docx', 'txt', 'md', 'html'] as DocumentKind[],
  },
  {
    value: 'csv',
    label: 'CSV (.csv)',
    extension: 'csv',
    mime: 'text/csv',
    supports: ['csv', 'xlsx', 'json', 'xml'] as DocumentKind[],
  },
  {
    value: 'xlsx',
    label: 'Excel (.xlsx)',
    extension: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    supports: ['csv', 'xlsx', 'json', 'xml'] as DocumentKind[],
  },
  {
    value: 'json',
    label: 'JSON (.json)',
    extension: 'json',
    mime: 'application/json',
    supports: ['csv', 'xlsx', 'json', 'xml'] as DocumentKind[],
  },
  {
    value: 'xml',
    label: 'XML (.xml)',
    extension: 'xml',
    mime: 'application/xml',
    supports: ['csv', 'xlsx', 'json', 'xml'] as DocumentKind[],
  },
] as const;

export type DocumentOutputFormat = (typeof DOCUMENT_OUTPUT_FORMATS)[number]['value'];

export const DOCUMENT_OUTPUT_FORMAT_VALUES = DOCUMENT_OUTPUT_FORMATS.map((format) => format.value) as [
  DocumentOutputFormat,
  ...DocumentOutputFormat[],
];

export type DocumentFileEntry = {
  id: string;
  file: File;
  format: DocumentKind;
  fileSize: number;
};

export type DocumentFilePreview = {
  file: File;
  format: DocumentKind;
  fileSize: number;
  pageCount?: number;
  sheetCount?: number;
};

export type ConvertedDocumentFile = {
  fileName: string;
  blob: Blob;
  size: number;
};

export type ConvertDocumentsInput = {
  files: File[];
  outputFormat: DocumentOutputFormat;
  onProgress?: ImageProgressReporter;
};

export type ConvertDocumentsSingleResult = {
  type: 'single';
  url: string;
  fileName: string;
  size: number;
  format: DocumentOutputFormat;
  blob: Blob;
};

export type ConvertDocumentsBatchResult = {
  type: 'batch';
  url: string;
  fileName: string;
  size: number;
  format: DocumentOutputFormat;
  successCount: number;
  failed: Array<{ fileName: string; error: string }>;
  items: Array<{ fileName: string; size: number }>;
};

export type ConvertDocumentsResult = ConvertDocumentsSingleResult | ConvertDocumentsBatchResult;
