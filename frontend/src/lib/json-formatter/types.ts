export type DataFormat = 'json' | 'yaml' | 'xml' | 'csv';

export type JsonFormatterAction = 'format' | 'minify' | 'validate' | 'sort' | 'convert';

export type JsonParseError = {
  message: string;
  line: number;
  column: number;
};

export type JsonFormatterSuccess = {
  ok: true;
  action: JsonFormatterAction;
  outputFormat: DataFormat;
  output: string;
  message?: string;
};

export type JsonFormatterFailure = {
  ok: false;
  error: string;
  line?: number;
  column?: number;
};

export type JsonFormatterResult = JsonFormatterSuccess | JsonFormatterFailure;

export class JsonFormatterError extends Error {
  line?: number;
  column?: number;

  constructor(message: string, line?: number, column?: number) {
    super(message);
    this.name = 'JsonFormatterError';
    this.line = line;
    this.column = column;
  }
}

export const DATA_FORMATS: Array<{ value: DataFormat; label: string; extension: string }> = [
  { value: 'json', label: 'JSON', extension: 'json' },
  { value: 'yaml', label: 'YAML', extension: 'yaml' },
  { value: 'xml', label: 'XML', extension: 'xml' },
  { value: 'csv', label: 'CSV', extension: 'csv' },
];

export const FORMAT_MIME_TYPES: Record<DataFormat, string> = {
  json: 'application/json',
  yaml: 'text/yaml',
  xml: 'application/xml',
  csv: 'text/csv',
};
