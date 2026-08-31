import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import * as XLSX from 'xlsx';
import type { ConvertedDocumentFile } from './types';
import type { DocumentOutputFormat } from './types';
import {
  buildBaseName,
  createBinaryConvertedFile,
  createConvertedFile,
  wrapHtmlDocument,
} from './utils';

function parseJsonText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('JSON inválido ou corrompido.');
  }
}

function parseXmlText(text: string): unknown {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    return parser.parse(text);
  } catch {
    throw new Error('XML inválido ou corrompido.');
  }
}

function normalizeJsonRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new Error('JSON vazio.');
    }

    if (data.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item))) {
      return data as Record<string, unknown>[];
    }

    throw new Error('JSON em array deve conter objetos para gerar CSV ou XLSX.');
  }

  if (data !== null && typeof data === 'object') {
    return [data as Record<string, unknown>];
  }

  throw new Error('JSON deve ser um objeto ou array de objetos.');
}

function jsonToXml(data: unknown): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true,
  });

  const xmlBody = builder.build({ root: data });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
}

function rowsToWorkbook(rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Dados');
  return workbook;
}

export async function convertJsonFile(
  file: File,
  outputFormat: DocumentOutputFormat,
): Promise<ConvertedDocumentFile[]> {
  const text = await file.text();
  const data = parseJsonText(text);
  const baseName = buildBaseName(file.name);

  if (outputFormat === 'json') {
    return [createConvertedFile(baseName, 'json', JSON.stringify(data, null, 2), 'application/json')];
  }

  if (outputFormat === 'txt') {
    return [createConvertedFile(baseName, 'txt', JSON.stringify(data, null, 2), 'text/plain')];
  }

  if (outputFormat === 'html') {
    const escaped = JSON.stringify(data, null, 2)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return [
      createConvertedFile(
        baseName,
        'html',
        wrapHtmlDocument(baseName, `<pre>${escaped}</pre>`),
        'text/html',
      ),
    ];
  }

  if (outputFormat === 'xml') {
    return [createConvertedFile(baseName, 'xml', jsonToXml(data), 'application/xml')];
  }

  if (outputFormat === 'csv' || outputFormat === 'xlsx') {
    const rows = normalizeJsonRows(data);
    const workbook = rowsToWorkbook(rows);

    if (outputFormat === 'csv') {
      const sheet = workbook.Sheets.Dados;
      return [createConvertedFile(baseName, 'csv', XLSX.utils.sheet_to_csv(sheet), 'text/csv')];
    }

    const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return [
      createBinaryConvertedFile(
        baseName,
        'xlsx',
        output,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
    ];
  }

  throw new Error(`Conversão de JSON para ${outputFormat.toUpperCase()} não disponível.`);
}

export async function convertXmlFile(
  file: File,
  outputFormat: DocumentOutputFormat,
): Promise<ConvertedDocumentFile[]> {
  const text = await file.text();
  const data = parseXmlText(text);
  const baseName = buildBaseName(file.name);

  if (outputFormat === 'xml') {
    return [createConvertedFile(baseName, 'xml', text.trim().startsWith('<?xml') ? text : jsonToXml(data), 'application/xml')];
  }

  if (outputFormat === 'json') {
    return [createConvertedFile(baseName, 'json', JSON.stringify(data, null, 2), 'application/json')];
  }

  if (outputFormat === 'txt') {
    return [createConvertedFile(baseName, 'txt', JSON.stringify(data, null, 2), 'text/plain')];
  }

  if (outputFormat === 'html') {
    const escaped = JSON.stringify(data, null, 2)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return [
      createConvertedFile(
        baseName,
        'html',
        wrapHtmlDocument(baseName, `<pre>${escaped}</pre>`),
        'text/html',
      ),
    ];
  }

  if (outputFormat === 'csv' || outputFormat === 'xlsx') {
    const rows = normalizeJsonRows(data);
    const workbook = rowsToWorkbook(rows);

    if (outputFormat === 'csv') {
      const sheet = workbook.Sheets.Dados;
      return [createConvertedFile(baseName, 'csv', XLSX.utils.sheet_to_csv(sheet), 'text/csv')];
    }

    const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return [
      createBinaryConvertedFile(
        baseName,
        'xlsx',
        output,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
    ];
  }

  throw new Error(`Conversão de XML para ${outputFormat.toUpperCase()} não disponível.`);
}
