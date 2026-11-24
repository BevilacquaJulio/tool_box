import { strFromU8, unzipSync } from 'fflate';
import { escapeHtml } from './utils';

// Leitores de ODT e RTF que produzem HTML; daí seguem pelo mesmo caminho dos demais (TXT, MD, HTML, PDF, DOCX).

// ---------- ODT (OpenDocument Text) ----------

type InlineStyle = { bold: boolean; italic: boolean; underline: boolean };

function readOdtStyles(doc: Document): Map<string, InlineStyle> {
  const styles = new Map<string, InlineStyle>();
  for (const style of Array.from(doc.getElementsByTagName('style:style'))) {
    const props = style.getElementsByTagName('style:text-properties')[0];
    if (!props) continue;
    const underline = props.getAttribute('style:text-underline-style');
    styles.set(style.getAttribute('style:name') ?? '', {
      bold: props.getAttribute('fo:font-weight') === 'bold',
      italic: props.getAttribute('fo:font-style') === 'italic',
      underline: Boolean(underline && underline !== 'none'),
    });
  }
  return styles;
}

function odtInline(node: Node, styles: Map<string, InlineStyle>): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? '');
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as Element;
  switch (el.tagName) {
    case 'text:s':
      return ' '.repeat(Number(el.getAttribute('text:c') ?? 1));
    case 'text:tab':
      return '\t';
    case 'text:line-break':
      return '<br />';
    case 'text:note':
    case 'office:annotation':
      return '';
  }

  const inner = Array.from(el.childNodes).map((child) => odtInline(child, styles)).join('');
  const style = styles.get(el.getAttribute('text:style-name') ?? '');
  if (!style) return inner;
  let html = inner;
  if (style.underline) html = `<u>${html}</u>`;
  if (style.italic) html = `<em>${html}</em>`;
  if (style.bold) html = `<strong>${html}</strong>`;
  return html;
}

function odtBlock(el: Element, styles: Map<string, InlineStyle>): string {
  const children = () => Array.from(el.children).map((child) => odtBlock(child, styles)).join('');
  switch (el.tagName) {
    case 'text:h': {
      const level = Math.min(Math.max(Number(el.getAttribute('text:outline-level') ?? 1), 1), 6);
      return `<h${level}>${odtInline(el, styles)}</h${level}>`;
    }
    case 'text:p':
      return `<p>${odtInline(el, styles)}</p>`;
    case 'text:list':
      return `<ul>${children()}</ul>`;
    case 'text:list-item':
      return `<li>${children()}</li>`;
    case 'table:table':
      return `<table>${children()}</table>`;
    case 'table:table-header-rows':
      return `<thead>${children()}</thead>`;
    case 'table:table-row':
      return `<tr>${children()}</tr>`;
    case 'table:table-cell':
      return `<td>${Array.from(el.children).map((child) => child.textContent ?? '').join(' ').trim()}</td>`;
    case 'text:section':
    case 'text:soft-page-break':
    case 'office:text':
      return children();
    default:
      return '';
  }
}

export async function odtToHtml(file: File): Promise<string> {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error('ODT inválido ou corrompido.');
  }
  const content = entries['content.xml'];
  if (!content) throw new Error('ODT sem content.xml: o arquivo não parece um documento de texto OpenDocument.');

  const doc = new DOMParser().parseFromString(strFromU8(content), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('ODT com XML inválido.');

  const body = doc.getElementsByTagName('office:text')[0];
  if (!body) throw new Error('Este ODT não contém texto (planilhas e apresentações não são suportadas).');
  return odtBlock(body, readOdtStyles(doc));
}

// ---------- RTF ----------

// Grupos de metadados que não são conteúdo visível.
const RTF_SKIP_DESTINATIONS = new Set([
  'fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'header', 'footer', 'headerl', 'headerr',
  'footerl', 'footerr', 'listtable', 'listoverridetable', 'rsidtbl', 'generator', 'xmlnstbl', 'themedata',
  'colorschememapping', 'latentstyles', 'datastore', 'object', 'filetbl', 'revtbl',
]);

const CP1252_HIGH = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ';

function cp1252(code: number): string {
  return code >= 0x80 && code <= 0x9f ? CP1252_HIGH[code - 0x80] : String.fromCharCode(code);
}

/** Extrai o texto de um RTF, mantendo parágrafos. Formatação (negrito, fontes) é descartada. */
export function rtfToText(rtf: string): string {
  if (!rtf.trimStart().startsWith('{\\rtf')) throw new Error('RTF inválido: o arquivo não começa com {\\rtf.');

  let out = '';
  let depth = 0;
  let skipDepth = -1; // profundidade do grupo ignorado, -1 = nenhum
  let ucSkip = 1;
  let pendingSkip = 0;
  let i = 0;

  const emit = (text: string) => {
    if (skipDepth === -1) out += text;
  };

  while (i < rtf.length) {
    const ch = rtf[i];
    if (ch === '{') {
      depth += 1;
      i += 1;
      if (rtf.startsWith('\\*', i) && skipDepth === -1) skipDepth = depth;
      continue;
    }
    if (ch === '}') {
      if (skipDepth === depth) skipDepth = -1;
      depth -= 1;
      i += 1;
      continue;
    }
    if (ch !== '\\') {
      if (ch !== '\r' && ch !== '\n') {
        if (pendingSkip > 0) pendingSkip -= 1;
        else emit(ch);
      }
      i += 1;
      continue;
    }

    const next = rtf[i + 1];
    if (next === "'") {
      const code = Number.parseInt(rtf.slice(i + 2, i + 4), 16);
      if (pendingSkip > 0) pendingSkip -= 1;
      else if (!Number.isNaN(code)) emit(cp1252(code));
      i += 4;
      continue;
    }
    if (next === '\\' || next === '{' || next === '}') {
      emit(next);
      i += 2;
      continue;
    }
    if (next === '~') {
      emit(' ');
      i += 2;
      continue;
    }

    const match = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i, i + 40));
    if (!match) {
      i += 2;
      continue;
    }
    const [token, word, param] = match;
    i += token.length;

    if (RTF_SKIP_DESTINATIONS.has(word) && skipDepth === -1) skipDepth = depth;
    else if (word === 'par' || word === 'sect' || word === 'page') emit('\n');
    else if (word === 'line') emit('\n');
    else if (word === 'tab') emit('\t');
    else if (word === 'cell') emit('\t');
    else if (word === 'row') emit('\n');
    else if (word === 'uc') ucSkip = Number(param ?? 1);
    else if (word === 'u' && param !== undefined) {
      const code = Number(param);
      emit(String.fromCharCode(code < 0 ? code + 65536 : code));
      pendingSkip = ucSkip; // ignora o caractere substituto ANSI que vem depois do \uN
    } else if (word === 'emdash') emit('—');
    else if (word === 'endash') emit('–');
    else if (word === 'bullet') emit('•');
    else if (word === 'lquote') emit('‘');
    else if (word === 'rquote') emit('’');
    else if (word === 'ldblquote') emit('“');
    else if (word === 'rdblquote') emit('”');
  }

  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function rtfToHtml(file: File): Promise<string> {
  const text = rtfToText(await file.text());
  return text
    .split(/\n{2,}|\n/)
    .filter((line) => line.trim())
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('\n');
}
