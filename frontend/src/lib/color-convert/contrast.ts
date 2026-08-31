import { compositeOnWhite, normalizeRgba } from './convert';
import type { ContrastResult, RgbaColor, WcagLevel } from './types';

function linearize(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: RgbaColor): number {
  const opaque = color.a < 1 ? compositeOnWhite(color) : normalizeRgba(color);
  const r = linearize(opaque.r);
  const g = linearize(opaque.g);
  const b = linearize(opaque.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: RgbaColor, background: RgbaColor): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

function evaluateNormalText(ratio: number): WcagLevel {
  if (ratio >= 7) {
    return 'aaa';
  }

  if (ratio >= 4.5) {
    return 'aa';
  }

  if (ratio >= 3) {
    return 'aa-large';
  }

  return 'fail';
}

function evaluateLargeText(ratio: number): WcagLevel {
  if (ratio >= 4.5) {
    return 'aaa';
  }

  if (ratio >= 3) {
    return 'aa';
  }

  return 'fail';
}

export function calculateContrast(foreground: RgbaColor, background: RgbaColor): ContrastResult {
  const ratio = contrastRatio(foreground, background);

  return {
    ratio,
    ratioFormatted: `${ratio.toFixed(2)}:1`,
    foreground: normalizeRgba(foreground),
    background: normalizeRgba(background),
    normalText: evaluateNormalText(ratio),
    largeText: evaluateLargeText(ratio),
  };
}

export const WCAG_LABELS: Record<WcagLevel, string> = {
  fail: 'Falha',
  'aa-large': 'AA (texto grande)',
  aa: 'AA',
  aaa: 'AAA',
};
