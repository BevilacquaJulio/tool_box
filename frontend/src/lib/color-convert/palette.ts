import { rgbaToHex } from './convert';
import { adjustSaturation, darkenColor, lightenColor, rotateHue } from './manipulate';
import type { PaletteSwatch, PaletteType, RgbaColor } from './types';

function toSwatch(label: string, color: RgbaColor): PaletteSwatch {
  return {
    label,
    color,
    hex: rgbaToHex(color),
  };
}

export function generatePalette(color: RgbaColor, type: PaletteType): PaletteSwatch[] {
  switch (type) {
    case 'shades':
      return [0, 15, 30, 45, 60].map((amount) =>
        toSwatch(`-${amount}%`, darkenColor(color, amount)),
      );

    case 'tints':
      return [0, 15, 30, 45, 60].map((amount) => toSwatch(`+${amount}%`, lightenColor(color, amount)));

    case 'complementary':
      return [
        toSwatch('Base', color),
        toSwatch('Complementar', rotateHue(color, 180)),
      ];

    case 'analogous':
      return [-30, -15, 0, 15, 30].map((degrees) =>
        toSwatch(degrees === 0 ? 'Base' : `${degrees > 0 ? '+' : ''}${degrees}°`, rotateHue(color, degrees)),
      );

    case 'triadic':
      return [0, 120, 240].map((degrees) =>
        toSwatch(degrees === 0 ? 'Base' : `${degrees}°`, rotateHue(color, degrees)),
      );

    default:
      return [toSwatch('Base', color)];
  }
}

export function generateSaturationScale(color: RgbaColor): PaletteSwatch[] {
  return [-40, -20, 0, 20, 40].map((amount) =>
    toSwatch(
      amount === 0 ? 'Base' : `${amount > 0 ? '+' : ''}${amount}%`,
      amount === 0 ? color : adjustSaturation(color, amount),
    ),
  );
}
