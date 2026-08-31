import { detectImageFormat } from './formats';

export type ImageFileEntry = {
  id: string;
  file: File;
  format: string;
  fileSize: number;
};

export function createImageFileEntry(file: File): ImageFileEntry {
  return {
    id: crypto.randomUUID(),
    file,
    format: detectImageFormat(file),
    fileSize: file.size,
  };
}

export function createImageFileEntries(files: File[]): ImageFileEntry[] {
  return files.map(createImageFileEntry);
}
