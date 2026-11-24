import { marked } from 'marked';
import TurndownService from 'turndown';
import type { DocumentOutputFormat } from './types';
import type { ConvertedDocumentFile } from './types';
import { buildBaseName, createConvertedFile, htmlToPlainText, wrapHtmlDocument } from './utils';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// O turndown converteria o <title> do <head> em texto: só o <body> vira Markdown.
function bodyOf(html: string): string {
  return /<body[\s>]/i.test(html) ? new DOMParser().parseFromString(html, 'text/html').body.innerHTML : html;
}

/** Converte um corpo HTML já extraído (ODT, RTF, PDF) para HTML, TXT ou Markdown. */
export function convertHtmlBody(
  baseName: string,
  html: string,
  outputFormat: DocumentOutputFormat,
): ConvertedDocumentFile[] {
  const bodyHtml = bodyOf(html);
  if (outputFormat === 'html') {
    return [createConvertedFile(baseName, 'html', wrapHtmlDocument(baseName, bodyHtml), 'text/html')];
  }
  if (outputFormat === 'md') {
    return [createConvertedFile(baseName, 'md', turndown.turndown(bodyHtml), 'text/markdown')];
  }
  if (outputFormat === 'txt') {
    return [createConvertedFile(baseName, 'txt', htmlToPlainText(bodyHtml), 'text/plain')];
  }
  throw new Error(`Conversão para ${outputFormat.toUpperCase()} não disponível.`);
}

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
      return [createConvertedFile(baseName, 'md', turndown.turndown(bodyOf(text)), 'text/markdown')];
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
