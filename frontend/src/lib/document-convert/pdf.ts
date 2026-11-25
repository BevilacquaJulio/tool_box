import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ConvertedDocumentFile, DocumentOutputFormat } from './types';
import { buildBaseName, createConvertedFile, escapeHtml, wrapHtmlDocument } from './utils';

let workerConfigured = false;

function ensurePdfWorker() {
  if (!workerConfigured) {
    GlobalWorkerOptions.workerSrc = pdfWorker;
    workerConfigured = true;
  }
}

async function withLoadedPdf<T>(
  file: File,
  run: (pdf: PDFDocumentProxy) => Promise<T>,
): Promise<T> {
  if (file.size === 0) {
    throw new Error(`"${file.name}" está vazio e não pode ser lido como PDF.`);
  }

  ensurePdfWorker();
  const buffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: new Uint8Array(buffer) });

  try {
    const pdf = await loadingTask.promise;
    return await run(pdf);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'PasswordException') {
        throw new Error(`"${file.name}" está protegido por senha. Remova a proteção antes de converter.`);
      }
      if (error.name === 'InvalidPDFException') {
        throw new Error(`Não foi possível ler "${file.name}". O PDF parece inválido ou corrompido.`);
      }
    }
    throw error;
  } finally {
    await loadingTask.destroy();
  }
}

export async function getPdfPageCount(file: File): Promise<number> {
  return withLoadedPdf(file, async (pdf) => pdf.numPages);
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
    // hasEOL marca o fim de cada linha visual; sem ele a página inteira vira uma linha só.
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : '') : ''))
      .join('')
      .replace(/[ \t]+\n/g, '\n')
      .trim();

    if (pageText) {
      chunks.push(pageText);
    }
  }

  return chunks.join('\n\n');
}

// Linha em branco separa parágrafos; quebras simples dentro do parágrafo viram <br />.
export function pdfTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, '<br />')}</p>`)
    .join('\n');
}

export async function convertPdfFile(
  file: File,
  outputFormat: Extract<DocumentOutputFormat, 'png' | 'jpeg' | 'txt' | 'html'>,
): Promise<ConvertedDocumentFile[]> {
  const baseName = buildBaseName(file.name);

  return withLoadedPdf(file, async (pdf) => {
    if (outputFormat === 'txt') {
      const text = await extractPdfText(pdf);
      return [createConvertedFile(baseName, 'txt', text, 'text/plain')];
    }

    if (outputFormat === 'html') {
      return [
        createConvertedFile(
          baseName,
          'html',
          wrapHtmlDocument(baseName, pdfTextToHtml(await extractPdfText(pdf))),
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
  });
}
