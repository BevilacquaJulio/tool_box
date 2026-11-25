import type { ImageProgressReporter } from '../image-convert/progress';
import { createUniqueFileName, createZipArchive } from '../image-convert/zip';
import { htmlToBlocks } from './blocks';
import { convertDocxFile } from './docx';
import { blocksToDocx } from './docx-writer';
import { detectDocumentKind, isSupportedDocument } from './formats';
import { getPdfPageCount, convertPdfFile } from './pdf';
import { blocksToPdf } from './pdf-writer';
import { odtToHtml, rtfToHtml } from './rich-text';
import { convertSpreadsheetFile, getWorkbookSheetCount } from './spreadsheet';
import { convertJsonFile, convertXmlFile } from './structured';
import { convertHtmlBody, convertTextLikeFile } from './text';
import {
  DOCUMENT_OUTPUT_FORMATS,
  type ConvertDocumentsInput,
  type ConvertDocumentsResult,
  type ConvertedDocumentFile,
  type DocumentFilePreview,
  type DocumentKind,
  type DocumentOutputFormat,
} from './types';
import { buildBaseName, createBinaryConvertedFile } from './utils';

const SUPPORTED_INPUTS = 'PDF, DOCX, ODT, RTF, TXT, Markdown, HTML, XLSX, CSV, JSON ou XML';

function getOutputMeta(format: DocumentOutputFormat) {
  const meta = DOCUMENT_OUTPUT_FORMATS.find((item) => item.value === format);
  if (!meta) {
    throw new Error('Formato de saída inválido');
  }
  return meta;
}

function assertSupportedCombination(kind: DocumentKind, outputFormat: DocumentOutputFormat) {
  const meta = getOutputMeta(outputFormat);
  if (!meta.supports.includes(kind)) {
    throw new Error(`O formato ${outputFormat.toUpperCase()} não é compatível com este tipo de arquivo.`);
  }
}

// Conversores de cada formato de entrada para as saídas "nativas" (sem PDF/DOCX gerados).
async function convertNativeFile(
  file: File,
  kind: DocumentKind,
  outputFormat: DocumentOutputFormat,
): Promise<ConvertedDocumentFile[]> {
  switch (kind) {
    case 'pdf':
      if (outputFormat === 'md') {
        const [html] = await convertPdfFile(file, 'html');
        return convertHtmlBody(buildBaseName(file.name), await html.blob.text(), 'md');
      }
      return convertPdfFile(file, outputFormat as Extract<DocumentOutputFormat, 'png' | 'jpeg' | 'txt' | 'html'>);
    case 'docx':
      return convertDocxFile(file, outputFormat as Extract<DocumentOutputFormat, 'html' | 'txt' | 'md'>);
    case 'odt':
      return convertHtmlBody(buildBaseName(file.name), await odtToHtml(file), outputFormat);
    case 'rtf':
      return convertHtmlBody(buildBaseName(file.name), await rtfToHtml(file), outputFormat);
    case 'txt':
    case 'md':
    case 'html':
      return convertTextLikeFile(file, kind, outputFormat);
    case 'csv':
    case 'xlsx':
      return convertSpreadsheetFile(file, kind, outputFormat);
    case 'json':
      return convertJsonFile(file, outputFormat);
    case 'xml':
      return convertXmlFile(file, outputFormat);
    default:
      throw new Error(`Tipo de documento não suportado: ${kind}`);
  }
}

// PDF e DOCX saem do HTML que o conversor do formato de origem já produz, preservando títulos, listas e tabelas.
async function convertToGeneratedDocument(
  file: File,
  kind: DocumentKind,
  outputFormat: 'pdf' | 'docx',
): Promise<ConvertedDocumentFile> {
  const [html] = await convertNativeFile(file, kind, 'html');
  const blocks = htmlToBlocks(await html.blob.text());
  if (blocks.length === 0) {
    throw new Error(`"${file.name}" não tem texto para exportar.`);
  }

  const baseName = buildBaseName(file.name);
  const meta = getOutputMeta(outputFormat);
  // zipSync devolve Uint8Array sobre ArrayBuffer comum; o tipo genérico do fflate só não diz isso.
  const content: BlobPart =
    outputFormat === 'pdf' ? await blocksToPdf(blocks, baseName) : (blocksToDocx(blocks, baseName) as Uint8Array<ArrayBuffer>);
  return createBinaryConvertedFile(baseName, meta.extension, content, meta.mime);
}

async function convertDocumentFile(
  file: File,
  outputFormat: DocumentOutputFormat,
): Promise<ConvertedDocumentFile[]> {
  if (!isSupportedDocument(file)) {
    throw new Error(`"${file.name}" ainda não é suportado. Use ${SUPPORTED_INPUTS}.`);
  }

  const kind = detectDocumentKind(file);
  assertSupportedCombination(kind, outputFormat);

  if (outputFormat === 'pdf' || outputFormat === 'docx') {
    return [await convertToGeneratedDocument(file, kind, outputFormat)];
  }
  return convertNativeFile(file, kind, outputFormat);
}

function createBatchProgressReporter(
  reporter: ImageProgressReporter | undefined,
  fileIndex: number,
  totalFiles: number,
): ImageProgressReporter {
  return (update) => {
    const sliceSize = 100 / totalFiles;
    const base = fileIndex * sliceSize;
    const value = base + (update.value / 100) * sliceSize;

    reporter?.({
      ...update,
      value,
      label:
        totalFiles > 1
          ? `Arquivo ${fileIndex + 1} de ${totalFiles}: ${update.label}`
          : update.label,
    });
  };
}

function flattenConvertedFiles(
  files: ConvertedDocumentFile[],
  usedNames: Set<string>,
): ConvertedDocumentFile[] {
  return files.map((file) => ({
    ...file,
    fileName: createUniqueFileName(file.fileName, usedNames),
  }));
}

function packSingleResult(
  file: ConvertedDocumentFile,
  outputFormat: DocumentOutputFormat,
): ConvertDocumentsResult {
  return {
    type: 'single',
    blob: file.blob,
    url: URL.createObjectURL(file.blob),
    fileName: file.fileName,
    size: file.size,
    format: outputFormat,
  };
}

async function packBatchResult(
  files: ConvertedDocumentFile[],
  outputFormat: DocumentOutputFormat,
  failed: Array<{ fileName: string; error: string }>,
): Promise<Extract<ConvertDocumentsResult, { type: 'batch' }>> {
  const zipBlob = await createZipArchive(files);
  return {
    type: 'batch',
    url: URL.createObjectURL(zipBlob),
    fileName: `documentos-convertidos-${outputFormat}.zip`,
    size: zipBlob.size,
    format: outputFormat,
    successCount: files.length,
    failed,
    items: files.map((file) => ({
      fileName: file.fileName,
      size: file.size,
    })),
  };
}

export async function inspectDocumentFile(file: File): Promise<DocumentFilePreview> {
  if (!isSupportedDocument(file)) {
    throw new Error(`"${file.name}" ainda não é suportado. Use ${SUPPORTED_INPUTS}.`);
  }

  const kind = detectDocumentKind(file);
  const preview: DocumentFilePreview = {
    file,
    format: kind,
    fileSize: file.size,
  };

  if (kind === 'pdf') {
    preview.pageCount = await getPdfPageCount(file);
  }

  if (kind === 'xlsx' || kind === 'csv') {
    preview.sheetCount = await getWorkbookSheetCount(file, kind);
  }

  return preview;
}

export async function convertDocuments(input: ConvertDocumentsInput): Promise<ConvertDocumentsResult> {
  const { files, outputFormat, onProgress } = input;

  if (files.length === 0) {
    throw new Error('Selecione ao menos um documento');
  }

  onProgress?.({
    stage: 'validating',
    value: 5,
    label: 'Validando documentos...',
  });

  const convertedFiles: ConvertedDocumentFile[] = [];
  const failedFiles: Array<{ fileName: string; error: string }> = [];
  const usedNames = new Set<string>();

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const reporter = createBatchProgressReporter(onProgress, index, files.length);

    reporter({
      stage: 'decoding',
      value: 10,
      label: 'Convertendo documento...',
    });

    try {
      const converted = await convertDocumentFile(file, outputFormat);
      convertedFiles.push(...flattenConvertedFiles(converted, usedNames));
      reporter({
        stage: 'encoding',
        value: 90,
        label: 'Documento convertido',
      });
    } catch (error) {
      failedFiles.push({
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Falha ao converter o documento',
      });
    }
  }

  if (convertedFiles.length === 0) {
    const detail =
      failedFiles.length === 1 ? ` ${failedFiles[0].error}` : ' Verifique os arquivos selecionados.';
    throw new Error(`Nenhum documento foi convertido.${detail}`);
  }

  onProgress?.({
    stage: 'encoding',
    value: 96,
    label: 'Preparando download...',
  });

  if (convertedFiles.length === 1 && files.length === 1) {
    onProgress?.({
      stage: 'done',
      value: 100,
      label: 'Concluído',
    });
    return packSingleResult(convertedFiles[0], outputFormat);
  }

  const batchResult = await packBatchResult(convertedFiles, outputFormat, failedFiles);

  onProgress?.({
    stage: 'done',
    value: 100,
    label: 'Concluído',
  });

  return batchResult;
}

export {
  DOCUMENT_FILE_ACCEPT,
  detectDocumentKind,
  getDocumentSelectionHint,
  isSupportedDocument,
} from './formats';
export {
  DOCUMENT_OUTPUT_FORMATS,
  DOCUMENT_OUTPUT_FORMAT_VALUES,
} from './types';
export { createDocumentFileEntries, createDocumentFileEntry } from './entries';
export type {
  ConvertDocumentsInput,
  ConvertDocumentsResult,
  DocumentFileEntry,
  DocumentFilePreview,
  DocumentKind,
  DocumentOutputFormat,
} from './types';
