import * as XLSX from 'xlsx';
import { XMLBuilder } from 'fast-xml-parser';
import type { ConvertedDocumentFile } from './types';
import type { DocumentOutputFormat } from './types';
import {
  buildBaseName,
  createBinaryConvertedFile,
  createConvertedFile,
  wrapHtmlDocument,
} from './utils';

async function loadWorkbook(file: File, inputKind: 'csv' | 'xlsx') {
  if (inputKind === 'csv') {
    const text = await file.text();
    return XLSX.read(text, { type: 'string' });
  }

  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: 'array' });
}

function getPrimarySheet(workbook: XLSX.WorkBook) {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Planilha vazia ou inválida.');
  }

  return workbook.Sheets[sheetName];
}

function sheetToJsonRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (rows.length === 0) {
    throw new Error('Nenhum dado tabular encontrado na planilha.');
  }
  return rows;
}

function jsonRowsToXml(rows: Record<string, unknown>[]): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true,
  });

  return builder.build({
    rows: {
      row: rows.map((row) =>
        Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? '')])),
      ),
    },
  });
}

export async function getWorkbookSheetCount(file: File, inputKind: 'csv' | 'xlsx'): Promise<number> {
  const workbook = await loadWorkbook(file, inputKind);
  return workbook.SheetNames.length;
}

export async function convertSpreadsheetFile(
  file: File,
  inputKind: 'csv' | 'xlsx',
  outputFormat: DocumentOutputFormat,
): Promise<ConvertedDocumentFile[]> {
  const workbook = await loadWorkbook(file, inputKind);
  const sheet = getPrimarySheet(workbook);
  const baseName = buildBaseName(file.name);

  if (outputFormat === 'csv') {
    return [createConvertedFile(baseName, 'csv', XLSX.utils.sheet_to_csv(sheet), 'text/csv')];
  }

  if (outputFormat === 'xlsx') {
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

  if (outputFormat === 'json') {
    const rows = sheetToJsonRows(sheet);
    return [createConvertedFile(baseName, 'json', JSON.stringify(rows, null, 2), 'application/json')];
  }

  if (outputFormat === 'txt') {
    return [createConvertedFile(baseName, 'txt', XLSX.utils.sheet_to_csv(sheet), 'text/plain')];
  }

  if (outputFormat === 'html') {
    const body = XLSX.utils.sheet_to_html(sheet);
    return [createConvertedFile(baseName, 'html', wrapHtmlDocument(baseName, body), 'text/html')];
  }

  if (outputFormat === 'xml') {
    const rows = sheetToJsonRows(sheet);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${jsonRowsToXml(rows)}`;
    return [createConvertedFile(baseName, 'xml', xml, 'application/xml')];
  }

  throw new Error(`Conversão de ${inputKind.toUpperCase()} para ${outputFormat.toUpperCase()} não disponível.`);
}
