import type { DocumentKind } from './types';

const EXTENSION_TO_KIND: Record<string, DocumentKind> = {
  pdf: 'pdf',
  docx: 'docx',
  doc: 'unknown',
  odt: 'odt',
  rtf: 'rtf',
  txt: 'txt',
  md: 'md',
  markdown: 'md',
  html: 'html',
  htm: 'html',
  xlsx: 'xlsx',
  xls: 'xlsx',
  xlsm: 'xlsx',
  xlsb: 'xlsx',
  ods: 'xlsx',
  csv: 'csv',
  tsv: 'csv',
  json: 'json',
  xml: 'xml',
};

export const DOCUMENT_FILE_ACCEPT =
  '.pdf,.docx,.odt,.rtf,.txt,.md,.markdown,.html,.htm,.xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.tsv,.json,.xml,application/pdf,application/x-pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,application/rtf,text/rtf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet,text/plain,text/markdown,text/html,text/csv,text/tab-separated-values,application/json,application/xml,text/xml';

function getExtension(file: File): string | undefined {
  const dotIndex = file.name.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === file.name.length - 1) {
    return undefined;
  }
  return file.name.slice(dotIndex + 1).toLowerCase();
}

export function detectDocumentKind(file: File): DocumentKind {
  const extension = getExtension(file);
  if (extension && extension in EXTENSION_TO_KIND) {
    return EXTENSION_TO_KIND[extension];
  }

  const mime = file.type.toLowerCase();
  if (
    mime === 'application/pdf' ||
    mime === 'application/x-pdf' ||
    mime === 'application/acrobat' ||
    mime === 'application/vnd.pdf'
  ) {
    return 'pdf';
  }
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx';
  }
  if (mime === 'application/vnd.oasis.opendocument.text') {
    return 'odt';
  }
  if (mime === 'application/rtf' || mime === 'text/rtf') {
    return 'rtf';
  }
  if (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.ms-excel.sheet.macroenabled.12' ||
    mime === 'application/vnd.oasis.opendocument.spreadsheet'
  ) {
    return 'xlsx';
  }
  if (mime === 'text/csv' || mime === 'text/tab-separated-values') {
    return 'csv';
  }
  if (mime === 'application/json' || mime === 'text/json') {
    return 'json';
  }
  if (mime === 'application/xml' || mime === 'text/xml') {
    return 'xml';
  }
  if (mime === 'text/markdown') {
    return 'md';
  }
  if (mime === 'text/html') {
    return 'html';
  }
  if (mime.startsWith('text/')) {
    return 'txt';
  }

  return 'unknown';
}

export function isSupportedDocument(file: File): boolean {
  const kind = detectDocumentKind(file);
  return kind !== 'unknown';
}

export function getDocumentSelectionHint(kind: DocumentKind): string {
  const hints: Record<DocumentKind, string> = {
    pdf: 'O PDF será convertido localmente no navegador.',
    docx: 'O Word (.docx) será convertido localmente no navegador.',
    odt: 'O documento OpenDocument (.odt) será convertido localmente no navegador.',
    rtf: 'O RTF será convertido localmente; a formatação é descartada e o texto é mantido.',
    txt: 'Arquivo de texto pronto para exportar em outros formatos.',
    md: 'O Markdown será convertido localmente no navegador.',
    html: 'O HTML será convertido localmente no navegador.',
    xlsx: 'A planilha Excel (.xlsx) será convertida localmente no navegador.',
    csv: 'O CSV será convertido localmente no navegador.',
    json: 'O JSON será convertido localmente no navegador.',
    xml: 'O XML será convertido localmente no navegador.',
    unknown: 'Formato ainda não suportado neste modo. Arquivos .doc antigos: salve como .docx.',
  };

  return hints[kind];
}
