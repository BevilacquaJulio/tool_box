import mammoth from 'mammoth';
import TurndownService from 'turndown';
import type { ConvertedDocumentFile } from './types';
import type { DocumentOutputFormat } from './types';
import { buildBaseName, createConvertedFile, wrapHtmlDocument } from './utils';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

export async function convertDocxFile(
  file: File,
  outputFormat: Extract<DocumentOutputFormat, 'html' | 'txt' | 'md'>,
): Promise<ConvertedDocumentFile[]> {
  const buffer = await file.arrayBuffer();
  const baseName = buildBaseName(file.name);

  if (outputFormat === 'html') {
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const html = wrapHtmlDocument(baseName, result.value);
    return [createConvertedFile(baseName, 'html', html, 'text/html')];
  }

  if (outputFormat === 'md') {
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const markdown = turndown.turndown(result.value);
    return [createConvertedFile(baseName, 'md', markdown, 'text/markdown')];
  }

  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return [createConvertedFile(baseName, 'txt', result.value, 'text/plain')];
}
