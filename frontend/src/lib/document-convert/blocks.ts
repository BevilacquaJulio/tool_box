// Modelo intermediário para gerar PDF e DOCX a partir do HTML que os conversores já produzem.

export type DocRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
};

export type DocBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; runs: DocRun[] }
  | { type: 'paragraph'; runs: DocRun[]; quote?: boolean }
  | { type: 'list-item'; ordered: boolean; listId: number; depth: number; runs: DocRun[] }
  | { type: 'code'; text: string }
  | { type: 'table'; rows: string[][]; header: boolean }
  | { type: 'rule' };

type RunStyle = Omit<DocRun, 'text'>;

const BLOCK_TAGS = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BODY', 'DD', 'DIV', 'DL', 'DT', 'FIGURE', 'FOOTER',
  'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE',
  'SECTION', 'TABLE', 'UL',
]);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'HEAD', 'TITLE', 'META', 'LINK']);

function inlineRuns(node: Node, style: RunStyle, out: DocRun[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ');
    if (text) out.push({ text, ...style });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as Element;
  const tag = el.tagName;
  if (SKIP_TAGS.has(tag) || tag === 'UL' || tag === 'OL') return;
  if (tag === 'BR') {
    out.push({ text: '\n', ...style });
    return;
  }
  if (tag === 'IMG') {
    const alt = el.getAttribute('alt');
    if (alt) out.push({ text: `[${alt}]`, ...style });
    return;
  }

  const next: RunStyle = { ...style };
  if (tag === 'B' || tag === 'STRONG' || tag === 'TH') next.bold = true;
  if (tag === 'I' || tag === 'EM' || tag === 'CITE') next.italic = true;
  if (tag === 'U' || tag === 'INS' || tag === 'A') next.underline = true;
  if (tag === 'CODE' || tag === 'KBD' || tag === 'SAMP' || tag === 'TT') next.code = true;

  el.childNodes.forEach((child) => inlineRuns(child, next, out));
}

function trimRuns(runs: DocRun[]): DocRun[] {
  const result = runs.filter((run) => run.text !== '');
  while (result.length && !result[0].text.trim() && result[0].text !== '\n') result.shift();
  while (result.length && !result[result.length - 1].text.trim()) result.pop();
  if (result.length) {
    result[0] = { ...result[0], text: result[0].text.replace(/^ +/, '') };
    const last = result.length - 1;
    result[last] = { ...result[last], text: result[last].text.replace(/ +$/, '') };
  }
  return result;
}

function cellText(cell: Element): string {
  return (cell.textContent ?? '').replace(/\s+/g, ' ').trim();
}

class BlockWalker {
  blocks: DocBlock[] = [];
  private listCounter = 0;

  walkContainer(container: Element, quote = false) {
    let pending: DocRun[] = [];
    const flush = () => {
      const runs = trimRuns(pending);
      if (runs.length) this.blocks.push({ type: 'paragraph', runs, ...(quote ? { quote } : {}) });
      pending = [];
    };

    container.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((child as Element).tagName)) {
        flush();
        this.walkBlock(child as Element, quote);
      } else {
        inlineRuns(child, {}, pending);
      }
    });
    flush();
  }

  private walkBlock(el: Element, quote: boolean) {
    const tag = el.tagName;

    if (/^H[1-6]$/.test(tag)) {
      const runs = trimRuns(collect(el));
      if (runs.length) {
        this.blocks.push({ type: 'heading', level: Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6, runs });
      }
      return;
    }
    if (tag === 'UL' || tag === 'OL') {
      this.walkList(el, 0);
      return;
    }
    if (tag === 'PRE') {
      const text = (el.textContent ?? '').replace(/\n$/, '');
      if (text.trim()) this.blocks.push({ type: 'code', text });
      return;
    }
    if (tag === 'TABLE') {
      const rows = Array.from(el.querySelectorAll('tr'))
        .map((tr) => Array.from(tr.children).filter((c) => c.tagName === 'TD' || c.tagName === 'TH').map(cellText))
        .filter((row) => row.some(Boolean));
      if (rows.length) {
        const header = Boolean(el.querySelector('thead')) || el.querySelector('tr')?.firstElementChild?.tagName === 'TH';
        this.blocks.push({ type: 'table', rows, header });
      }
      return;
    }
    if (tag === 'HR') {
      this.blocks.push({ type: 'rule' });
      return;
    }
    this.walkContainer(el, quote || tag === 'BLOCKQUOTE');
  }

  private walkList(list: Element, depth: number) {
    const ordered = list.tagName === 'OL';
    const listId = ++this.listCounter;

    for (const item of Array.from(list.children)) {
      if (item.tagName !== 'LI') continue;
      const runs = trimRuns(collect(item));
      if (runs.length) this.blocks.push({ type: 'list-item', ordered, listId, depth: Math.min(depth, 8), runs });
      item.querySelectorAll(':scope > ul, :scope > ol').forEach((nested) => this.walkList(nested, depth + 1));
    }
  }
}

function collect(el: Element): DocRun[] {
  const runs: DocRun[] = [];
  el.childNodes.forEach((child) => inlineRuns(child, {}, runs));
  return runs;
}

export function htmlToBlocks(html: string): DocBlock[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walker = new BlockWalker();
  walker.walkContainer(doc.body);
  return walker.blocks;
}

export function runsToText(runs: DocRun[]): string {
  return runs.map((run) => run.text).join('');
}

/** Texto puro com quebras entre blocos (textContent do body juntaria parágrafos sem espaço). */
export function blocksToText(blocks: DocBlock[]): string {
  const counters = new Map<number, number>();
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
        case 'paragraph':
          return runsToText(block.runs);
        case 'list-item': {
          const n = (counters.get(block.listId) ?? 0) + 1;
          counters.set(block.listId, n);
          return `${'  '.repeat(block.depth)}${block.ordered ? `${n}.` : '-'} ${runsToText(block.runs)}`;
        }
        case 'code':
          return block.text;
        case 'table':
          return block.rows.map((row) => row.join('\t')).join('\n');
        case 'rule':
          return '---';
      }
    })
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
