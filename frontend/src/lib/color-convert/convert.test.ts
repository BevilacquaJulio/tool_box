import { describe, expect, it } from 'vitest';
import { calculateContrast, rgbaToFormats, rgbaToHex } from './index';
import { parseColorInput } from './parse';

describe('color-convert', () => {
  it('converte HEX para formatos', () => {
    const color = parseColorInput('#336699');
    const formats = rgbaToFormats(color);

    expect(formats.hex).toBe('#336699');
    expect(formats.rgb).toBe('rgb(51, 102, 153)');
    expect(formats.hsl).toContain('210');
  });

  it('calcula contraste entre preto e branco', () => {
    const result = calculateContrast(
      { r: 0, g: 0, b: 0, a: 1 },
      { r: 255, g: 255, b: 255, a: 1 },
    );

    expect(result.ratio).toBeGreaterThan(20);
    expect(result.normalText).toBe('aaa');
  });

  it('parseia RGBA', () => {
    const color = parseColorInput('rgba(255, 128, 0, 0.5)');
    expect(rgbaToHex(color, true)).toBe('#FF800080');
  });
});
