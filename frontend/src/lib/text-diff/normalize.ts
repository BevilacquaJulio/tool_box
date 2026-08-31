import type { DiffOptions } from './types';

export function splitLines(text: string, ignoreLineBreaks: boolean): string[] {
  const normalized = ignoreLineBreaks ? text.replace(/\r\n/g, '\n').replace(/\r/g, '\n') : text;

  if (normalized.length === 0) {
    return [];
  }

  const lines = normalized.split('\n');

  if (lines.length > 1 && lines.at(-1) === '') {
    lines.pop();
  }

  return lines;
}

export function normalizeLineForCompare(line: string, options: DiffOptions): string {
  let value = line;

  if (options.ignoreLineBreaks) {
    value = value.replace(/\r/g, '');
  }

  if (options.ignoreWhitespace) {
    value = value.replace(/\s+/g, '');
  } else {
    value = value.trimEnd();
  }

  if (options.ignoreCase) {
    value = value.toLowerCase();
  }

  return value;
}

export function normalizeTextForCompare(text: string, options: DiffOptions): string {
  let value = text;

  if (options.ignoreLineBreaks) {
    value = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  if (options.ignoreWhitespace) {
    value = value.replace(/\s+/g, '');
  }

  if (options.ignoreCase) {
    value = value.toLowerCase();
  }

  return value;
}
