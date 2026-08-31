import { describe, expect, it } from 'vitest';
import { getLineColumn, parseJsonText } from './parse';
import { processJsonInput } from './index';
import { sortObjectKeys } from './transform';

describe('parseJsonText', () => {
  it('identifica linha e coluna de erro', () => {
    const source = '{"nome": "teste",}';

    try {
      parseJsonText(source);
      expect.unreachable('deveria falhar');
    } catch (error) {
      expect(error).toMatchObject({
        line: expect.any(Number),
        column: expect.any(Number),
      });
    }
  });
});

describe('getLineColumn', () => {
  it('calcula posicao corretamente', () => {
    expect(getLineColumn('abc\ndef', 5)).toEqual({ line: 2, column: 2 });
  });
});

describe('processJsonInput', () => {
  it('formata JSON', () => {
    const result = processJsonInput({
      text: '{"b":2,"a":1}',
      inputFormat: 'json',
      action: 'format',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toBe('{\n  "b": 2,\n  "a": 1\n}\n');
    }
  });

  it('minifica JSON', () => {
    const result = processJsonInput({
      text: '{\n  "a": 1\n}\n',
      inputFormat: 'json',
      action: 'minify',
    });

    expect(result).toEqual({
      ok: true,
      action: 'minify',
      outputFormat: 'json',
      output: '{"a":1}',
    });
  });

  it('ordena propriedades', () => {
    const sorted = sortObjectKeys({ z: 1, a: { y: 2, b: 3 } });
    expect(Object.keys(sorted as object)).toEqual(['a', 'z']);
    expect(Object.keys((sorted as { a: object }).a)).toEqual(['b', 'y']);
  });
});
