import { detectDocumentKind } from './formats';
import type { DocumentFileEntry } from './types';

let fallbackIdCounter = 0;

function generateEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  fallbackIdCounter += 1;
  return `doc-${Date.now()}-${fallbackIdCounter}`;
}

export function createDocumentFileEntry(file: File): DocumentFileEntry {
  return {
    id: generateEntryId(),
    file,
    format: detectDocumentKind(file),
    fileSize: file.size,
  };
}

export function createDocumentFileEntries(files: File[]): DocumentFileEntry[] {
  return files.map(createDocumentFileEntry);
}
