import { detectDocumentKind } from './formats';
import type { DocumentFileEntry } from './types';

export function createDocumentFileEntry(file: File): DocumentFileEntry {
  return {
    id: crypto.randomUUID(),
    file,
    format: detectDocumentKind(file),
    fileSize: file.size,
  };
}

export function createDocumentFileEntries(files: File[]): DocumentFileEntry[] {
  return files.map(createDocumentFileEntry);
}
