import type { DocumentKind } from './types';

const EXTENSION_TO_KIND: Record<string, DocumentKind> = {
  pdf: 'pdf',
  docx: 'docx',
  doc: 'unknown',
  odt: 'unknown',
  rtf: 'unknown',
  txt: 'txt',
  md: 'md',
  markdown: 'md',
  html: 'html',
  htm: 'html',
  xlsx: 'xlsx',
  csv: 'csv',
  json: 'json',
  xml: 'xml',
};

export const DOCUMENT_FILE_ACCEPT =
  '.pdf,.docx,.txt,.md,.markdown,.html,.htm,.xlsx,.csv,.json,.xml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/markdown,text/html,text/csv,application/json,application/xml,text/xml';

export function detectDocumentKind(file: File): DocumentKind {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && extension in EXTENSION_TO_KIND) {
    return EXTENSION_TO_KIND[extension];
  }

  const mime = file.type.toLowerCase();
  if (mime === 'application/pdf') {
    return 'pdf';
  }
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx';
  }
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return 'xlsx';
  }
  if (mime === 'text/csv') {
    return 'csv';
  }
  if (mime === 'application/json') {
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
    txt: 'Arquivo de texto pronto para exportar em outros formatos.',
    md: 'O Markdown será convertido localmente no navegador.',
    html: 'O HTML será convertido localmente no navegador.',
    xlsx: 'A planilha Excel (.xlsx) será convertida localmente no navegador.',
    csv: 'O CSV será convertido localmente no navegador.',
    json: 'O JSON será convertido localmente no navegador.',
    xml: 'O XML será convertido localmente no navegador.',
    unknown: 'Formato ainda não suportado neste modo.',
  };

  return hints[kind];
}
