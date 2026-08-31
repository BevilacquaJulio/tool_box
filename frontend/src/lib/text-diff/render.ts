export type CharDiffPart = {
  value: string;
  type: 'unchanged' | 'added' | 'removed';
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderCharParts(parts: CharDiffPart[]): string {
  return parts
    .map((part) => {
      const escaped = escapeHtml(part.value);

      if (part.type === 'unchanged') {
        return escaped;
      }

      if (part.type === 'removed') {
        return `<mark class="diff-char-removed">${escaped}</mark>`;
      }

      return `<mark class="diff-char-added">${escaped}</mark>`;
    })
    .join('');
}

export function renderFullLineHighlight(text: string, type: 'added' | 'removed'): string {
  return renderCharParts([{ value: text, type }]);
}
