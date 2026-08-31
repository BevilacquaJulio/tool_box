import { diffArrays } from 'diff';
import { buildInlineCharDiff } from './inline';
import { normalizeLineForCompare, splitLines } from './normalize';
import { renderCharParts, renderFullLineHighlight } from './render';
import type { DiffOptions, DiffResult, DiffRow, DiffStats } from './types';
import { TextDiffError } from './types';

function pairModifiedRows(rows: DiffRow[]): DiffRow[] {
  const paired: DiffRow[] = [];
  let index = 0;

  while (index < rows.length) {
    const current = rows[index];

    if (current.type !== 'removed') {
      paired.push(current);
      index += 1;
      continue;
    }

    const removedBlock: DiffRow[] = [];
    while (index < rows.length && rows[index].type === 'removed') {
      removedBlock.push(rows[index]);
      index += 1;
    }

    const addedBlock: DiffRow[] = [];
    while (index < rows.length && rows[index].type === 'added') {
      addedBlock.push(rows[index]);
      index += 1;
    }

    if (removedBlock.length > 0 && addedBlock.length > 0) {
      const pairCount = Math.min(removedBlock.length, addedBlock.length);

      for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
        const removed = removedBlock[pairIndex];
        const added = addedBlock[pairIndex];

        paired.push({
          type: 'modified',
          leftLineNumber: removed.leftLineNumber,
          rightLineNumber: added.rightLineNumber,
          leftText: removed.leftText,
          rightText: added.rightText,
        });
      }

      for (const row of removedBlock.slice(pairCount)) {
        paired.push(row);
      }

      for (const row of addedBlock.slice(pairCount)) {
        paired.push(row);
      }

      continue;
    }

    paired.push(...removedBlock, ...addedBlock);
  }

  return paired;
}

function enrichRowWithInlineDiff(row: DiffRow): DiffRow {
  if (row.type === 'unchanged') {
    return row;
  }

  if (row.type === 'removed' && row.leftText !== null) {
    return {
      ...row,
      leftHtml: renderFullLineHighlight(row.leftText, 'removed'),
    };
  }

  if (row.type === 'added' && row.rightText !== null) {
    return {
      ...row,
      rightHtml: renderFullLineHighlight(row.rightText, 'added'),
    };
  }

  if (row.type === 'modified' && row.leftText !== null && row.rightText !== null) {
    const { leftParts, rightParts } = buildInlineCharDiff(row.leftText, row.rightText);

    return {
      ...row,
      leftHtml: renderCharParts(leftParts),
      rightHtml: renderCharParts(rightParts),
    };
  }

  return row;
}

function buildStats(rows: DiffRow[]): DiffStats {
  return rows.reduce<DiffStats>(
    (accumulator, row) => {
      accumulator[row.type] += 1;
      return accumulator;
    },
    { added: 0, removed: 0, modified: 0, unchanged: 0 },
  );
}

function buildUnifiedDiff(leftLabel: string, rightLabel: string, rows: DiffRow[]): string {
  const header = [`--- ${leftLabel}`, `+++ ${rightLabel}`, '@@'].join('\n');
  const body = rows
    .flatMap((row) => {
      switch (row.type) {
        case 'unchanged':
          return [` ${row.leftText ?? ''}`];
        case 'added':
          return [`+${row.rightText ?? ''}`];
        case 'removed':
          return [`-${row.leftText ?? ''}`];
        case 'modified':
          return [`-${row.leftText ?? ''}`, `+${row.rightText ?? ''}`];
        default:
          return [];
      }
    })
    .join('\n');

  return `${header}\n${body}\n`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rowClassName(type: DiffRow['type']): string {
  switch (type) {
    case 'added':
      return 'diff-added';
    case 'removed':
      return 'diff-removed';
    case 'modified':
      return 'diff-modified';
    default:
      return 'diff-unchanged';
  }
}

export function buildExportHtml(rows: DiffRow[], leftLabel: string, rightLabel: string): string {
  const tableRows = rows
    .map((row) => {
      const leftNumber = row.leftLineNumber ?? '';
      const rightNumber = row.rightLineNumber ?? '';
      const leftText = row.leftHtml ?? escapeHtml(row.leftText ?? '');
      const rightText = row.rightHtml ?? escapeHtml(row.rightText ?? '');

      return `<tr class="${rowClassName(row.type)}">
  <td class="line-number">${leftNumber}</td>
  <td class="line-content"><pre>${leftText}</pre></td>
  <td class="line-number">${rightNumber}</td>
  <td class="line-content"><pre>${rightText}</pre></td>
</tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Diff: ${escapeHtml(leftLabel)} vs ${escapeHtml(rightLabel)}</title>
  <style>
    body { font-family: "IBM Plex Mono", monospace; margin: 0; background: #fafafa; color: #09090b; }
    table { width: 100%; border-collapse: collapse; }
    td, th { border-bottom: 1px solid #e4e4e7; vertical-align: top; }
    .line-number { width: 3rem; text-align: right; padding: 0.25rem 0.5rem; color: #71717a; background: #f4f4f5; }
    .line-content { width: 50%; padding: 0; }
    pre { margin: 0; padding: 0.25rem 0.75rem; white-space: pre-wrap; word-break: break-word; }
    .diff-added .line-content:last-child { background: #ecfdf5; }
    .diff-removed .line-content:first-of-type { background: #fef2f2; }
    .diff-modified .line-content:first-of-type { background: #fff7ed; }
    .diff-modified .line-content:last-child { background: #eff6ff; }
    mark.diff-char-removed { background: #fecaca; border-radius: 0.125rem; padding: 0 0.125rem; }
    mark.diff-char-added { background: #bbf7d0; border-radius: 0.125rem; padding: 0 0.125rem; }
    thead th { position: sticky; top: 0; background: #fff; padding: 0.75rem; text-align: left; border-bottom: 2px solid #d4d4d8; }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr>
        <th colspan="2">${escapeHtml(leftLabel)}</th>
        <th colspan="2">${escapeHtml(rightLabel)}</th>
      </tr>
    </thead>
    <tbody>
${tableRows}
    </tbody>
  </table>
</body>
</html>`;
}

export function compareTexts(
  leftText: string,
  rightText: string,
  options: DiffOptions,
  leftLabel = 'Original',
  rightLabel = 'Comparacao',
): DiffResult {
  if (!leftText && !rightText) {
    throw new TextDiffError('Informe ao menos um texto para comparar.');
  }

  const leftLines = splitLines(leftText, options.ignoreLineBreaks);
  const rightLines = splitLines(rightText, options.ignoreLineBreaks);
  const leftCompare = leftLines.map((line) => normalizeLineForCompare(line, options));
  const rightCompare = rightLines.map((line) => normalizeLineForCompare(line, options));

  const changes = diffArrays(leftCompare, rightCompare);
  const rawRows: DiffRow[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  for (const change of changes) {
    if (!change.added && !change.removed) {
      for (const _line of change.value) {
        rawRows.push({
          type: 'unchanged',
          leftLineNumber: leftIndex + 1,
          rightLineNumber: rightIndex + 1,
          leftText: leftLines[leftIndex] ?? '',
          rightText: rightLines[rightIndex] ?? '',
        });
        leftIndex += 1;
        rightIndex += 1;
      }
      continue;
    }

    if (change.removed) {
      for (const _line of change.value) {
        rawRows.push({
          type: 'removed',
          leftLineNumber: leftIndex + 1,
          rightLineNumber: null,
          leftText: leftLines[leftIndex] ?? '',
          rightText: null,
        });
        leftIndex += 1;
      }
      continue;
    }

    if (change.added) {
      for (const _line of change.value) {
        rawRows.push({
          type: 'added',
          leftLineNumber: null,
          rightLineNumber: rightIndex + 1,
          leftText: null,
          rightText: rightLines[rightIndex] ?? '',
        });
        rightIndex += 1;
      }
    }
  }

  const rows = pairModifiedRows(rawRows).map(enrichRowWithInlineDiff);
  const stats = buildStats(rows);
  const identical = stats.added === 0 && stats.removed === 0 && stats.modified === 0;
  const unified = buildUnifiedDiff(leftLabel, rightLabel, rows);
  const html = buildExportHtml(rows, leftLabel, rightLabel);

  return { rows, stats, unified, html, identical };
}
