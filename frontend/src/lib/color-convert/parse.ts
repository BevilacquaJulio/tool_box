import {
  cmykToRgba,
  hexToRgba,
  hslToRgba,
  hsvToRgba,
  normalizeRgba,
} from './convert';
import type { RgbaColor } from './types';
import { ColorConvertError } from './types';

function parseNumericList(input: string, expected: number): number[] {
  const values = input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const percent = part.endsWith('%');
      const numeric = Number.parseFloat(part.replace('%', ''));

      if (!Number.isFinite(numeric)) {
        throw new ColorConvertError('Valor numérico inválido na cor informada.');
      }

      return percent ? numeric : numeric;
    });

  if (values.length !== expected) {
    throw new ColorConvertError('Quantidade de componentes inválida.');
  }

  return values;
}

function parseAlpha(value: number, allowPercent = false): number {
  if (allowPercent && value > 1) {
    return value / 100;
  }

  return value > 1 ? value / 255 : value;
}

export function parseColorInput(input: string): RgbaColor {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new ColorConvertError('Informe uma cor para converter.');
  }

  if (trimmed.startsWith('#')) {
    return hexToRgba(trimmed);
  }

  const functionMatch = trimmed.match(/^([a-zA-Z]+)\((.+)\)$/);
  if (!functionMatch) {
    throw new ColorConvertError('Formato de cor não reconhecido.');
  }

  const format = functionMatch[1].toLowerCase();
  const body = functionMatch[2];

  switch (format) {
    case 'rgb': {
      const [r, g, b] = parseNumericList(body, 3);
      return normalizeRgba({ r, g, b, a: 1 });
    }

    case 'rgba': {
      const parts = body.split(',').map((part) => part.trim());
      if (parts.length !== 4) {
        throw new ColorConvertError('RGBA deve ter quatro componentes.');
      }

      const [r, g, b] = parts.slice(0, 3).map(Number.parseFloat);
      const alpha = parseAlpha(Number.parseFloat(parts[3] ?? '1'));
      return normalizeRgba({ r, g, b, a: alpha });
    }

    case 'hsl': {
      const [h, s, l] = parseNumericList(body, 3);
      return hslToRgba(h, s, l, 1);
    }

    case 'hsla': {
      const parts = body.split(',').map((part) => part.trim());
      if (parts.length !== 4) {
        throw new ColorConvertError('HSLA deve ter quatro componentes.');
      }

      const h = Number.parseFloat(parts[0] ?? '0');
      const s = Number.parseFloat((parts[1] ?? '0').replace('%', ''));
      const l = Number.parseFloat((parts[2] ?? '0').replace('%', ''));
      const alpha = parseAlpha(Number.parseFloat(parts[3] ?? '1'));
      return hslToRgba(h, s, l, alpha);
    }

    case 'hsv': {
      const [h, s, v] = parseNumericList(body, 3);
      return hsvToRgba(h, s, v, 1);
    }

    case 'hsva': {
      const parts = body.split(',').map((part) => part.trim());
      if (parts.length !== 4) {
        throw new ColorConvertError('HSVA deve ter quatro componentes.');
      }

      const h = Number.parseFloat(parts[0] ?? '0');
      const s = Number.parseFloat((parts[1] ?? '0').replace('%', ''));
      const v = Number.parseFloat((parts[2] ?? '0').replace('%', ''));
      const alpha = parseAlpha(Number.parseFloat(parts[3] ?? '1'));
      return hsvToRgba(h, s, v, alpha);
    }

    case 'cmyk': {
      const [c, m, y, k] = parseNumericList(body, 4);
      return cmykToRgba(c, m, y, k, 1);
    }

    default:
      throw new ColorConvertError(`O formato "${format}" não é suportado.`);
  }
}

export function detectInputFormat(input: string): string {
  const trimmed = input.trim();

  if (trimmed.startsWith('#')) {
    return 'HEX';
  }

  const match = trimmed.match(/^([a-zA-Z]+)\(/);
  return match ? match[1].toUpperCase() : 'Desconhecido';
}
