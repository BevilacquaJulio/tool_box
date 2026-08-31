import { XMLBuilder } from 'fast-xml-parser';
import * as XLSX from 'xlsx';
import { stringify as stringifyYaml } from 'yaml';
import type { DataFormat } from './types';
import { JsonFormatterError } from './types';

function normalizeCsvRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new JsonFormatterError('Não há linhas para converter em CSV.');
    }

    if (data.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item))) {
      return data as Record<string, unknown>[];
    }

    throw new JsonFormatterError('CSV exige um array de objetos com chaves consistentes.');
  }

  if (data !== null && typeof data === 'object') {
    return [data as Record<string, unknown>];
  }

  throw new JsonFormatterError('CSV exige um objeto ou array de objetos.');
}

function serializeCsv(rows: Record<string, unknown>[]): string {
  const sheet = XLSX.utils.json_to_sheet(rows);
  return `${XLSX.utils.sheet_to_csv(sheet)}\n`;
}

function serializeXml(data: unknown): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true,
  });

  const body = builder.build({ root: data });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`;
}

export function serializeData(data: unknown, format: DataFormat): string {
  switch (format) {
    case 'json':
      return `${JSON.stringify(data, null, 2)}\n`;

    case 'yaml':
      return `${stringifyYaml(data)}\n`;

    case 'xml':
      return serializeXml(data);

    case 'csv':
      return serializeCsv(normalizeCsvRows(data));

    default:
      throw new JsonFormatterError('Formato de saída não suportado.');
  }
}

export function getAvailableOutputFormats(data: unknown): DataFormat[] {
  const formats: DataFormat[] = ['json', 'yaml', 'xml'];

  try {
    normalizeCsvRows(data);
    formats.push('csv');
  } catch {
    // CSV indisponivel para este formato de dados.
  }

  return formats;
}
