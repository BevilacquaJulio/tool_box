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

export function wrapHtmlDocument(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
</head>
<body>
${body}
</body>
</html>`;
}

export function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
}
