import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ConvertedDocumentFile, DocumentOutputFormat } from './types';
import { buildBaseName, createConvertedFile, wrapHtmlDocument } from './utils';

let workerConfigured = false;

function ensurePdfWorker() {
  if (!workerConfigured) {
    GlobalWorkerOptions.workerSrc = pdfWorker;
    workerConfigured = true;
  }
}

async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  ensurePdfWorker();
  const buffer = await file.arrayBuffer();
  return getDocument({ data: buffer }).promise;
}

export async function getPdfPageCount(file: File): Promise<number> {
  const pdf = await loadPdf(file);
  return pdf.numPages;
}

async function renderPageToBlob(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  mimeType: 'image/png' | 'image/jpeg',
): Promise<Blob> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Não foi possível renderizar a página do PDF');
  }

  await page.render({ canvas, canvasContext: context, viewport }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Não foi possível gerar a imagem da página'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      mimeType === 'image/jpeg' ? 0.92 : undefined,
    );
  });
}

async function extractPdfText(pdf: PDFDocumentProxy): Promise<string> {
  const chunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim();

    if (pageText) {
      chunks.push(pageText);
    }
  }

  return chunks.join('\n\n');
}

export async function convertPdfFile(
  file: File,
  outputFormat: Extract<DocumentOutputFormat, 'png' | 'jpeg' | 'txt' | 'html'>,
): Promise<ConvertedDocumentFile[]> {
  const pdf = await loadPdf(file);
  const baseName = buildBaseName(file.name);

  if (outputFormat === 'txt') {
    const text = await extractPdfText(pdf);
    return [createConvertedFile(baseName, 'txt', text, 'text/plain')];
  }

  if (outputFormat === 'html') {
    const text = await extractPdfText(pdf);
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />');

    return [
      createConvertedFile(
        baseName,
        'html',
        wrapHtmlDocument(baseName, `<div>${escaped}</div>`),
        'text/html',
      ),
    ];
  }

  const mimeType = outputFormat === 'png' ? 'image/png' : 'image/jpeg';
  const extension = outputFormat === 'png' ? 'png' : 'jpg';
  const results: ConvertedDocumentFile[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const blob = await renderPageToBlob(pdf, pageNumber, mimeType);
    const suffix = pdf.numPages > 1 ? `-pagina-${pageNumber}` : '';
    results.push({
      fileName: `${baseName}${suffix}.${extension}`,
      blob,
      size: blob.size,
    });
  }

  return results;
}
