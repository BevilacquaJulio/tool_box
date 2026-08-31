import { XMLParser } from 'fast-xml-parser';
import parseJson from 'json-parse-even-better-errors';
import * as XLSX from 'xlsx';
import { parse as parseYaml } from 'yaml';
import type { DataFormat } from './types';
import { JsonFormatterError } from './types';

export function getLineColumn(text: string, index: number): { line: number; column: number } {
  const safeIndex = Math.max(0, Math.min(index, text.length));
  const before = text.slice(0, safeIndex);
  const lines = before.split('\n');

  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}

export function parseJsonText(text: string): unknown {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new JsonFormatterError('Informe um JSON para processar.');
  }

  try {
    return parseJson(trimmed);
  } catch (error) {
    if (error && typeof error === 'object') {
      const parseError = error as {
        message?: string;
        position?: number;
      };

      if (parseError.position !== undefined) {
        const location = getLineColumn(trimmed, parseError.position);
        throw new JsonFormatterError(
          parseError.message ?? 'JSON inválido.',
          location.line,
          location.column,
        );
      }

      throw new JsonFormatterError(parseError.message ?? 'JSON inválido.');
    }

    throw new JsonFormatterError(error instanceof Error ? error.message : 'JSON inválido.');
  }
}

function parseYamlText(text: string): unknown {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new JsonFormatterError('Informe um YAML para processar.');
  }

  try {
    return parseYaml(trimmed);
  } catch (error) {
    if (error && typeof error === 'object' && 'linePos' in error) {
      const linePos = error.linePos as { line?: number; col?: number };
      throw new JsonFormatterError(
        error instanceof Error ? error.message : 'YAML inválido.',
        linePos.line,
        linePos.col,
      );
    }

    const message = error instanceof Error ? error.message : 'YAML inválido.';
    const match = message.match(/at line (\d+), column (\d+)/i);

    if (match) {
      throw new JsonFormatterError(message, Number(match[1]), Number(match[2]));
    }

    throw new JsonFormatterError(message);
  }
}

function parseXmlText(text: string): unknown {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new JsonFormatterError('Informe um XML para processar.');
  }

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    return parser.parse(trimmed);
  } catch (error) {
    throw new JsonFormatterError(error instanceof Error ? error.message : 'XML inválido.');
  }
}

function parseCsvText(text: string): unknown {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new JsonFormatterError('Informe um CSV para processar.');
  }

  try {
    const workbook = XLSX.read(trimmed, { type: 'string' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new JsonFormatterError('CSV vazio.');
    }

    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } catch (error) {
    if (error instanceof JsonFormatterError) {
      throw error;
    }

    throw new JsonFormatterError(error instanceof Error ? error.message : 'CSV inválido.');
  }
}

export function parseInputText(text: string, format: DataFormat): unknown {
  switch (format) {
    case 'json':
      return parseJsonText(text);
    case 'yaml':
      return parseYamlText(text);
    case 'xml':
      return parseXmlText(text);
    case 'csv':
      return parseCsvText(text);
    default:
      throw new JsonFormatterError('Formato de entrada não suportado.');
  }
}

export function detectInputFormat(text: string): DataFormat {
  const trimmed = text.trim();

  if (!trimmed) {
    return 'json';
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }

  if (trimmed.startsWith('<')) {
    return 'xml';
  }

  if (trimmed.includes('\n- ') || trimmed.startsWith('- ') || /^[\w-]+:\s/m.test(trimmed)) {
    return 'yaml';
  }

  if (trimmed.includes(',') && trimmed.includes('\n')) {
    return 'csv';
  }

  return 'json';
}
