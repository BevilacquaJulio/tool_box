import type { RgbaColor } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampByte(value: number): number {
  return clamp(Math.round(value), 0, 255);
}

function clampAlpha(value: number): number {
  return clamp(value, 0, 1);
}

function componentToHex(value: number): string {
  return clampByte(value).toString(16).padStart(2, '0');
}

export function normalizeRgba(color: RgbaColor): RgbaColor {
  return {
    r: clampByte(color.r),
    g: clampByte(color.g),
    b: clampByte(color.b),
    a: clampAlpha(color.a),
  };
}

export function rgbaToHex(color: RgbaColor, includeAlpha = false): string {
  const normalized = normalizeRgba(color);
  const hex = `#${componentToHex(normalized.r)}${componentToHex(normalized.g)}${componentToHex(normalized.b)}`;

  if (!includeAlpha || normalized.a >= 1) {
    return hex.toUpperCase();
  }

  return `${hex}${componentToHex(normalized.a * 255)}`.toUpperCase();
}

export function hexToRgba(input: string): RgbaColor {
  const value = input.trim().replace(/^#/, '');

  if (!/^[0-9a-fA-F]{3,8}$/.test(value)) {
    throw new Error('HEX inválido.');
  }

  if (value.length === 3 || value.length === 4) {
    const expanded = value
      .split('')
      .map((char) => char + char)
      .join('');

    return hexToRgba(`#${expanded}`);
  }

  if (value.length === 6 || value.length === 8) {
    const r = Number.parseInt(value.slice(0, 2), 16);
    const g = Number.parseInt(value.slice(2, 4), 16);
    const b = Number.parseInt(value.slice(4, 6), 16);
    const a = value.length === 8 ? Number.parseInt(value.slice(6, 8), 16) / 255 : 1;

    return normalizeRgba({ r, g, b, a });
  }

  throw new Error('HEX inválido.');
}

export function rgbaToRgbString(color: RgbaColor): string {
  const normalized = normalizeRgba(color);
  return `rgb(${normalized.r}, ${normalized.g}, ${normalized.b})`;
}

export function rgbaToRgbaString(color: RgbaColor): string {
  const normalized = normalizeRgba(color);
  const alpha = Number(normalized.a.toFixed(3)).toString();
  return `rgba(${normalized.r}, ${normalized.g}, ${normalized.b}, ${alpha})`;
}

export function rgbaToHsl(color: RgbaColor): { h: number; s: number; l: number } {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h: Math.round(h * 10) / 10,
    s: Math.round(s * 1000) / 10,
    l: Math.round(l * 1000) / 10,
  };
}

export function hslToRgba(h: number, s: number, l: number, alpha = 1): RgbaColor {
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = (((h % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (huePrime >= 0 && huePrime < 1) {
    r1 = chroma;
    g1 = x;
  } else if (huePrime < 2) {
    r1 = x;
    g1 = chroma;
  } else if (huePrime < 3) {
    g1 = chroma;
    b1 = x;
  } else if (huePrime < 4) {
    g1 = x;
    b1 = chroma;
  } else if (huePrime < 5) {
    r1 = x;
    b1 = chroma;
  } else {
    r1 = chroma;
    b1 = x;
  }

  const m = lightness - chroma / 2;

  return normalizeRgba({
    r: (r1 + m) * 255,
    g: (g1 + m) * 255,
    b: (b1 + m) * 255,
    a: alpha,
  });
}

export function rgbaToHsv(color: RgbaColor): { h: number; s: number; v: number } {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  const s = max === 0 ? 0 : delta / max;

  return {
    h: Math.round(h * 10) / 10,
    s: Math.round(s * 1000) / 10,
    v: Math.round(max * 1000) / 10,
  };
}

export function hsvToRgba(h: number, s: number, v: number, alpha = 1): RgbaColor {
  const saturation = clamp(s, 0, 100) / 100;
  const value = clamp(v, 0, 100) / 100;
  const chroma = value * saturation;
  const huePrime = (((h % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (huePrime >= 0 && huePrime < 1) {
    r1 = chroma;
    g1 = x;
  } else if (huePrime < 2) {
    r1 = x;
    g1 = chroma;
  } else if (huePrime < 3) {
    g1 = chroma;
    b1 = x;
  } else if (huePrime < 4) {
    g1 = x;
    b1 = chroma;
  } else if (huePrime < 5) {
    r1 = x;
    b1 = chroma;
  } else {
    r1 = chroma;
    b1 = x;
  }

  const m = value - chroma;

  return normalizeRgba({
    r: (r1 + m) * 255,
    g: (g1 + m) * 255,
    b: (b1 + m) * 255,
    a: alpha,
  });
}

export function rgbaToCmyk(color: RgbaColor): { c: number; m: number; y: number; k: number } {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const k = 1 - Math.max(r, g, b);

  if (k >= 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

export function cmykToRgba(c: number, m: number, y: number, k: number, alpha = 1): RgbaColor {
  const cyan = clamp(c, 0, 100) / 100;
  const magenta = clamp(m, 0, 100) / 100;
  const yellow = clamp(y, 0, 100) / 100;
  const black = clamp(k, 0, 100) / 100;

  return normalizeRgba({
    r: 255 * (1 - cyan) * (1 - black),
    g: 255 * (1 - magenta) * (1 - black),
    b: 255 * (1 - yellow) * (1 - black),
    a: alpha,
  });
}

export function rgbaToFormats(color: RgbaColor) {
  const normalized = normalizeRgba(color);
  const hsl = rgbaToHsl(normalized);
  const hsv = rgbaToHsv(normalized);
  const cmyk = rgbaToCmyk(normalized);

  return {
    hex: rgbaToHex(normalized),
    rgb: rgbaToRgbString(normalized),
    rgba: rgbaToRgbaString(normalized),
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    hsla: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${Number(normalized.a.toFixed(3))})`,
    hsv: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`,
    hsva: `hsva(${hsv.h}, ${hsv.s}%, ${hsv.v}%, ${Number(normalized.a.toFixed(3))})`,
    cmyk: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
  };
}

export function compositeOnWhite(color: RgbaColor): RgbaColor {
  const alpha = color.a;

  return normalizeRgba({
    r: color.r * alpha + 255 * (1 - alpha),
    g: color.g * alpha + 255 * (1 - alpha),
    b: color.b * alpha + 255 * (1 - alpha),
    a: 1,
  });
}
