import { diffChars } from 'diff';
import type { CharDiffPart } from './render';

export function buildInlineCharDiff(
  leftText: string,
  rightText: string,
): { leftParts: CharDiffPart[]; rightParts: CharDiffPart[] } {
  const changes = diffChars(leftText, rightText);
  const leftParts: CharDiffPart[] = [];
  const rightParts: CharDiffPart[] = [];

  for (const change of changes) {
    if (!change.added && !change.removed) {
      leftParts.push({ value: change.value, type: 'unchanged' });
      rightParts.push({ value: change.value, type: 'unchanged' });
      continue;
    }

    if (change.removed) {
      leftParts.push({ value: change.value, type: 'removed' });
    }

    if (change.added) {
      rightParts.push({ value: change.value, type: 'added' });
    }
  }

  return { leftParts, rightParts };
}
