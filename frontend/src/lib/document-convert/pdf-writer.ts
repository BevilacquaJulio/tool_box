import type { jsPDF as JsPdf } from 'jspdf';
import type { DocBlock, DocRun } from './blocks';

// Layout próprio sobre o jsPDF para manter texto selecionável com negrito/itálico por trecho.

const PAGE = { margin: 56, width: 595.28, height: 841.89 }; // A4 em pontos
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const BODY_SIZE = 11;
const HEADING_SIZES = [0, 22, 18, 15, 13, 12, 11];
const CODE_SIZE = 9.5;
const LINE = 1.4;

// As fontes padrão do PDF só cobrem WinAnsi (Latin-1 + aspas/travessões). O resto vira "?" em vez de lixo.
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const REPLACEMENTS: Record<string, string> = { '→': '->', '←': '<-', '≥': '>=', '≤': '<=', '✓': 'v', '✔': 'v', ' ': ' ' };

export function toWinAnsi(text: string): string {
  return Array.from(text.normalize('NFC'))
    .map((ch) => {
      if (REPLACEMENTS[ch]) return REPLACEMENTS[ch];
      const code = ch.codePointAt(0)!;
      if (ch === '\t') return '    ';
      if (ch === '\n') return ch; // quebras são tratadas pelo layout depois
      if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa1 && code <= 0xff) || WIN_ANSI_EXTRA.includes(ch)) return ch;
      return '?';
    })
    .join('');
}

class Layout {
  y = PAGE.margin;

  constructor(private doc: JsPdf) {}

  ensure(height: number) {
    if (this.y + height > PAGE.height - PAGE.margin) {
      this.doc.addPage();
      this.y = PAGE.margin;
    }
  }

  private font(run: Pick<DocRun, 'bold' | 'italic' | 'code'>, size: number) {
    const style = run.bold && run.italic ? 'bolditalic' : run.bold ? 'bold' : run.italic ? 'italic' : 'normal';
    this.doc.setFont(run.code ? 'courier' : 'helvetica', style);
    this.doc.setFontSize(size);
  }

  /** Quebra os trechos em palavras e posiciona cada uma, trocando a fonte por trecho. */
  runs(runs: DocRun[], size: number, indent = 0, force: Partial<DocRun> = {}) {
    const lineHeight = size * LINE;
    const maxWidth = CONTENT_WIDTH - indent;
    type Word = { text: string; run: DocRun; width: number; space: number };
    const lines: Word[][] = [[]];
    let lineWidth = 0;

    for (const original of runs) {
      const run = { ...original, ...force };
      for (const [index, piece] of toWinAnsi(run.text).split('\n').entries()) {
        if (index > 0) {
          lines.push([]);
          lineWidth = 0;
        }
        for (const token of piece.split(/(?<= )/)) {
          if (!token) continue;
          this.font(run, size);
          const text = token.trimEnd();
          const width = this.doc.getTextWidth(text);
          const space = token.length > text.length ? this.doc.getTextWidth(' ') : 0;
          if (lineWidth + width > maxWidth && lines[lines.length - 1].length) {
            lines.push([]);
            lineWidth = 0;
          }
          lines[lines.length - 1].push({ text, run, width, space });
          lineWidth += width + space;
        }
      }
    }

    for (const line of lines) {
      this.ensure(lineHeight);
      let x = PAGE.margin + indent;
      for (const word of line) {
        this.font(word.run, size);
        this.doc.text(word.text, x, this.y + size);
        if (word.run.underline) {
          this.doc.setLineWidth(0.5);
          this.doc.line(x, this.y + size + 1.5, x + word.width, this.y + size + 1.5);
        }
        x += word.width + word.space;
      }
      this.y += lineHeight;
    }
  }

  code(text: string) {
    this.doc.setFont('courier', 'normal');
    this.doc.setFontSize(CODE_SIZE);
    const lineHeight = CODE_SIZE * 1.35;
    const lines = toWinAnsi(text)
      .split('\n')
      .flatMap((line) => (line ? (this.doc.splitTextToSize(line, CONTENT_WIDTH - 16) as string[]) : ['']));

    for (const line of lines) {
      this.ensure(lineHeight);
      this.doc.setFillColor(244, 244, 245);
      this.doc.rect(PAGE.margin, this.y, CONTENT_WIDTH, lineHeight, 'F');
      this.doc.text(line, PAGE.margin + 8, this.y + CODE_SIZE);
      this.y += lineHeight;
    }
    this.y += 8;
  }

  table(rows: string[][], header: boolean) {
    const columns = Math.max(...rows.map((row) => row.length));
    const colWidth = CONTENT_WIDTH / columns;
    const size = columns > 6 ? 8 : 9.5;
    const pad = 4;
    const lineHeight = size * 1.3;

    rows.forEach((row, rowIndex) => {
      const bold = header && rowIndex === 0;
      this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
      this.doc.setFontSize(size);
      const cells = Array.from({ length: columns }, (_, i) =>
        this.doc.splitTextToSize(toWinAnsi(row[i] ?? ''), colWidth - pad * 2) as string[],
      );
      const height = Math.max(...cells.map((cell) => cell.length)) * lineHeight + pad * 2;
      this.ensure(height);

      cells.forEach((cell, i) => {
        const x = PAGE.margin + i * colWidth;
        this.doc.setDrawColor(161, 161, 170);
        if (bold) {
          this.doc.setFillColor(244, 244, 245);
          this.doc.rect(x, this.y, colWidth, height, 'FD');
        } else {
          this.doc.rect(x, this.y, colWidth, height);
        }
        cell.forEach((line, lineIndex) => this.doc.text(line, x + pad, this.y + pad + size + lineIndex * lineHeight));
      });
      this.y += height;
    });
    this.y += 10;
  }

  rule() {
    this.ensure(12);
    this.doc.setDrawColor(161, 161, 170);
    this.doc.setLineWidth(0.75);
    this.doc.line(PAGE.margin, this.y + 6, PAGE.width - PAGE.margin, this.y + 6);
    this.y += 14;
  }
}

export async function blocksToPdf(blocks: DocBlock[], title: string): Promise<ArrayBuffer> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setProperties({ title: toWinAnsi(title) });
  const layout = new Layout(doc);
  const listCounters = new Map<number, number>();

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const size = HEADING_SIZES[block.level];
        layout.y += block.level <= 2 ? 10 : 6;
        layout.ensure(size * LINE * 2); // não deixa o título sozinho no pé da página
        layout.runs(block.runs, size, 0, { bold: true });
        layout.y += 4;
        break;
      }
      case 'paragraph': {
        const startY = layout.y;
        layout.runs(block.runs, BODY_SIZE, block.quote ? 16 : 0, block.quote ? { italic: true } : {});
        if (block.quote && layout.y > startY) {
          doc.setDrawColor(161, 161, 170);
          doc.setLineWidth(2);
          doc.line(PAGE.margin + 4, startY, PAGE.margin + 4, layout.y);
        }
        layout.y += 6;
        break;
      }
      case 'list-item': {
        const indent = 18 * (block.depth + 1);
        layout.ensure(BODY_SIZE * LINE);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(BODY_SIZE);
        const number = (listCounters.get(block.listId) ?? 0) + 1;
        listCounters.set(block.listId, number);
        const marker = block.ordered ? `${number}.` : '';
        if (marker) {
          doc.text(marker, PAGE.margin + indent - 4, layout.y + BODY_SIZE, { align: 'right' });
        } else {
          doc.setFillColor(39, 39, 42);
          doc.circle(PAGE.margin + indent - 8, layout.y + BODY_SIZE * 0.65, 1.6, 'F');
        }
        layout.runs(block.runs, BODY_SIZE, indent);
        layout.y += 2;
        break;
      }
      case 'code':
        layout.code(block.text);
        break;
      case 'table':
        layout.table(block.rows, block.header);
        break;
      case 'rule':
        layout.rule();
        break;
    }
  }

  return doc.output('arraybuffer');
}
