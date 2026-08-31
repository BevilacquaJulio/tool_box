import { getAvailableOutputFormats, serializeData } from './convert';
import { detectInputFormat, parseInputText } from './parse';
import { formatJson, minifyJson, sortObjectKeys } from './transform';
import type {
  DataFormat,
  JsonFormatterAction,
  JsonFormatterFailure,
  JsonFormatterResult,
  JsonFormatterSuccess,
} from './types';
import { JsonFormatterError } from './types';

type ProcessInput = {
  text: string;
  inputFormat: DataFormat | 'auto';
  action: JsonFormatterAction;
  outputFormat?: DataFormat;
};

function success(partial: Omit<JsonFormatterSuccess, 'ok'>): JsonFormatterSuccess {
  return { ok: true, ...partial };
}

function failure(error: JsonFormatterError | Error): JsonFormatterFailure {
  if (error instanceof JsonFormatterError) {
    return {
      ok: false,
      error: error.message,
      line: error.line,
      column: error.column,
    };
  }

  return { ok: false, error: error.message };
}

export function processJsonInput(input: ProcessInput): JsonFormatterResult {
  try {
    const trimmed = input.text.trim();

    if (!trimmed) {
      throw new JsonFormatterError('Informe um conteúdo para processar.');
    }

    const inputFormat =
      input.inputFormat === 'auto' ? detectInputFormat(trimmed) : input.inputFormat;
    const data = parseInputText(trimmed, inputFormat);

    switch (input.action) {
      case 'validate': {
        const typeLabel = Array.isArray(data) ? 'array' : typeof data;
        const sizeLabel = Array.isArray(data)
          ? `${data.length} item(ns)`
          : data !== null && typeof data === 'object'
            ? `${Object.keys(data as object).length} propriedade(s)`
            : 'valor escalar';

        return success({
          action: 'validate',
          outputFormat: inputFormat,
          output: trimmed,
          message: `Sintaxe válida (${inputFormat.toUpperCase()}). Tipo: ${typeLabel}, ${sizeLabel}.`,
        });
      }

      case 'format':
        return success({
          action: 'format',
          outputFormat: 'json',
          output: formatJson(data),
        });

      case 'minify':
        return success({
          action: 'minify',
          outputFormat: 'json',
          output: minifyJson(data),
        });

      case 'sort': {
        const sorted = sortObjectKeys(data);
        return success({
          action: 'sort',
          outputFormat: 'json',
          output: formatJson(sorted),
        });
      }

      case 'convert': {
        const outputFormat = input.outputFormat ?? 'json';

        if (!getAvailableOutputFormats(data).includes(outputFormat)) {
          throw new JsonFormatterError(
            `A conversão para ${outputFormat.toUpperCase()} não é possível com este conteúdo.`,
          );
        }

        return success({
          action: 'convert',
          outputFormat,
          output: serializeData(data, outputFormat),
        });
      }

      default:
        throw new JsonFormatterError('Ação não suportada.');
    }
  } catch (error) {
    return failure(error instanceof Error ? error : new Error('Falha ao processar o conteúdo.'));
  }
}

export {
  detectInputFormat,
  getAvailableOutputFormats,
  parseInputText,
  serializeData,
  sortObjectKeys,
  formatJson,
  minifyJson,
};

export {
  DATA_FORMATS,
  FORMAT_MIME_TYPES,
  JsonFormatterError,
  type DataFormat,
  type JsonFormatterAction,
  type JsonFormatterResult,
} from './types';
