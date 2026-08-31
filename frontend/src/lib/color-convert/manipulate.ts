import { hslToRgba, normalizeRgba, rgbaToHsl } from './convert';
import type { RgbaColor } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lightenColor(color: RgbaColor, amount: number): RgbaColor {
  const hsl = rgbaToHsl(color);
  const nextLightness = clamp(hsl.l + amount, 0, 100);
  return hslToRgba(hsl.h, hsl.s, nextLightness, color.a);
}

export function darkenColor(color: RgbaColor, amount: number): RgbaColor {
  return lightenColor(color, -amount);
}

export function adjustSaturation(color: RgbaColor, amount: number): RgbaColor {
  const hsl = rgbaToHsl(color);
  const nextSaturation = clamp(hsl.s + amount, 0, 100);
  return hslToRgba(hsl.h, nextSaturation, hsl.l, color.a);
}

export function rotateHue(color: RgbaColor, degrees: number): RgbaColor {
  const hsl = rgbaToHsl(color);
  const nextHue = (hsl.h + degrees + 360) % 360;
  return normalizeRgba(hslToRgba(nextHue, hsl.s, hsl.l, color.a));
}
