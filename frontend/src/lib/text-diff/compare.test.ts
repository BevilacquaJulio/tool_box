import { describe, expect, it } from 'vitest';
import { compareTexts } from './compare';

describe('compareTexts', () => {
  it('identifica linhas adicionadas e removidas', () => {
    const result = compareTexts('a\nb', 'a\nc', {
      ignoreWhitespace: false,
      ignoreLineBreaks: true,
      ignoreCase: false,
    });

    expect(result.stats.modified).toBe(1);
    expect(result.rows.some((row) => row.type === 'modified')).toBe(true);
  });

  it('ignora diferencas de maiusculas quando configurado', () => {
    const result = compareTexts('Hello', 'hello', {
      ignoreWhitespace: false,
      ignoreLineBreaks: true,
      ignoreCase: true,
    });

    expect(result.stats.added).toBe(0);
    expect(result.stats.removed).toBe(0);
    expect(result.stats.modified).toBe(0);
    expect(result.stats.unchanged).toBe(1);
  });

  it('ignora espacos em branco quando configurado', () => {
    const result = compareTexts('a   b', 'ab', {
      ignoreWhitespace: true,
      ignoreLineBreaks: true,
      ignoreCase: false,
    });

    expect(result.identical).toBe(true);
    expect(result.stats.unchanged).toBe(1);
  });

  it('destaca diferencas por caractere em linhas modificadas', () => {
    const result = compareTexts('hello', 'hallo', {
      ignoreWhitespace: false,
      ignoreLineBreaks: true,
      ignoreCase: false,
    });

    expect(result.stats.modified).toBe(1);
    expect(result.rows[0]?.leftHtml).toContain('mark');
    expect(result.rows[0]?.leftHtml).toContain('e');
    expect(result.rows[0]?.rightHtml).toContain('a');
  });
});
