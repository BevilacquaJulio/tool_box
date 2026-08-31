import { marked } from 'marked';
import TurndownService from 'turndown';
import type { DocumentOutputFormat } from './types';
import type { ConvertedDocumentFile } from './types';
import { buildBaseName, createConvertedFile, htmlToPlainText, wrapHtmlDocument } from './utils';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

export async function convertTextLikeFile(
  file: File,
  inputKind: 'txt' | 'md' | 'html',
  outputFormat: DocumentOutputFormat,
): Promise<ConvertedDocumentFile[]> {
  const text = await file.text();
  const baseName = buildBaseName(file.name);

  if (outputFormat === 'txt') {
    if (inputKind === 'html') {
      return [createConvertedFile(baseName, 'txt', htmlToPlainText(text), 'text/plain')];
    }
    return [createConvertedFile(baseName, 'txt', text, 'text/plain')];
  }

  if (outputFormat === 'md') {
    if (inputKind === 'html') {
      return [createConvertedFile(baseName, 'md', turndown.turndown(text), 'text/markdown')];
    }
    return [createConvertedFile(baseName, 'md', text, 'text/markdown')];
  }

  if (outputFormat === 'html') {
    if (inputKind === 'md') {
      const body = await marked.parse(text);
      return [createConvertedFile(baseName, 'html', wrapHtmlDocument(baseName, body), 'text/html')];
    }

    if (inputKind === 'html') {
      const html = text.includes('<html') ? text : wrapHtmlDocument(baseName, text);
      return [createConvertedFile(baseName, 'html', html, 'text/html')];
    }

    const escaped = text
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

  throw new Error(`Conversão de ${inputKind.toUpperCase()} para ${outputFormat.toUpperCase()} não disponível.`);
}
