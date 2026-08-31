export type RgbaColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type ColorFormats = {
  hex: string;
  rgb: string;
  rgba: string;
  hsl: string;
  hsla: string;
  hsv: string;
  hsva: string;
  cmyk: string;
};

export type WcagLevel = 'fail' | 'aa-large' | 'aa' | 'aaa';

export type ContrastResult = {
  ratio: number;
  ratioFormatted: string;
  foreground: RgbaColor;
  background: RgbaColor;
  normalText: WcagLevel;
  largeText: WcagLevel;
};

export type PaletteType = 'shades' | 'tints' | 'complementary' | 'analogous' | 'triadic';

export type PaletteSwatch = {
  label: string;
  color: RgbaColor;
  hex: string;
};

export class ColorConvertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ColorConvertError';
  }
}

export const PALETTE_TYPES: Array<{ value: PaletteType; label: string; description: string }> = [
  { value: 'shades', label: 'Sombras', description: 'Escurece progressivamente' },
  { value: 'tints', label: 'Tons claros', description: 'Clareia progressivamente' },
  { value: 'complementary', label: 'Complementar', description: 'Cor oposta no círculo cromático' },
  { value: 'analogous', label: 'Análogas', description: 'Cores vizinhas no matiz' },
  { value: 'triadic', label: 'Tríade', description: 'Três matizes equidistantes' },
];
