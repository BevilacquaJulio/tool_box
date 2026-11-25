import { detectImageFormat } from './formats';

export type ImageFileEntry = {
  id: string;
  file: File;
  format: string;
  fileSize: number;
};

let fallbackIdCounter = 0;

function generateEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  fallbackIdCounter += 1;
  return `img-${Date.now()}-${fallbackIdCounter}`;
}

export function createImageFileEntry(file: File): ImageFileEntry {
  return {
    id: generateEntryId(),
    file,
    format: detectImageFormat(file),
    fileSize: file.size,
  };
}

export function createImageFileEntries(files: File[]): ImageFileEntry[] {
  return files.map(createImageFileEntry);
}
