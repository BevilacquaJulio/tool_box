import type { ImageProgressReporter } from '../image-convert/progress';
import { createUniqueFileName, createZipArchive } from '../image-convert/zip';
import { convertDocxFile } from './docx';
import { detectDocumentKind, isSupportedDocument } from './formats';
import { getPdfPageCount, convertPdfFile } from './pdf';
import { convertSpreadsheetFile, getWorkbookSheetCount } from './spreadsheet';
import { convertJsonFile, convertXmlFile } from './structured';
import { convertTextLikeFile } from './text';
import {
  DOCUMENT_OUTPUT_FORMATS,
  type ConvertDocumentsInput,
  type ConvertDocumentsResult,
  type ConvertedDocumentFile,
  type DocumentFilePreview,
  type DocumentKind,
  type DocumentOutputFormat,
} from './types';

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

async function convertDocumentFile(
  file: File,
  outputFormat: DocumentOutputFormat,
): Promise<ConvertedDocumentFile[]> {
  if (!isSupportedDocument(file)) {
    throw new Error(
      `"${file.name}" ainda não é suportado. Use PDF, DOCX, TXT, Markdown, HTML, XLSX, CSV, JSON ou XML.`,
    );
  }

  const kind = detectDocumentKind(file);
  assertSupportedCombination(kind, outputFormat);

  switch (kind) {
    case 'pdf':
      return convertPdfFile(file, outputFormat as Extract<DocumentOutputFormat, 'png' | 'jpeg' | 'txt' | 'html'>);
    case 'docx':
      return convertDocxFile(file, outputFormat as Extract<DocumentOutputFormat, 'html' | 'txt' | 'md'>);
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
    throw new Error(
      `"${file.name}" ainda não é suportado. Use PDF, DOCX, TXT, Markdown, HTML, XLSX, CSV, JSON ou XML.`,
    );
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
    throw new Error('Nenhum documento foi convertido. Verifique os arquivos selecionados.');
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
