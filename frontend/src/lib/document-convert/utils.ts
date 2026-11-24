import { blocksToText, htmlToBlocks } from './blocks';
import type { ConvertedDocumentFile } from './types';

export function buildBaseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').trim() || 'documento';
}

export function createConvertedFile(
  baseName: string,
  extension: string,
  content: BlobPart,
  mimeType: string,
): ConvertedDocumentFile {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  return {
    fileName: `${baseName}.${extension}`,
    blob,
    size: blob.size,
  };
}

export function createBinaryConvertedFile(
  baseName: string,
  extension: string,
  content: BlobPart,
  mimeType: string,
): ConvertedDocumentFile {
  const blob = new Blob([content], { type: mimeType });
  return {
    fileName: `${baseName}.${extension}`,
    blob,
    size: blob.size,
  };
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function wrapHtmlDocument(title: string, body: string): string {
  // O título vem do nome do arquivo: escapado para não injetar marcação no <head>.
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
</head>
<body>
${body}
</body>
</html>`;
}

export function htmlToPlainText(html: string): string {
  return blocksToText(htmlToBlocks(html));
}
