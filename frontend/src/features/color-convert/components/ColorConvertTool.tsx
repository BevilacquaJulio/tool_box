import { useEffect, useMemo, useState } from 'react';
import { AnimatedSelect } from '../../../components/AnimatedSelect';
import { Input } from '../../../components/Input';
import { TOOL_GRID_CLASS } from '../../../layout/content';
import {
  generatePalette,
  generateSaturationScale,
  hslToRgba,
  normalizeRgba,
  PALETTE_TYPES,
  parseColorInput,
  rgbaToFormats,
  rgbaToHex,
  rgbaToHsl,
  type PaletteType,
  type RgbaColor,
} from '../../../lib/color-convert';
import { ColorSwatch, CopyColorRow } from './CopyColorRow';
import { GradientBuilder } from './GradientBuilder';
import { VisualStylePreview } from './VisualStylePreview';

const DEFAULT_COLOR: RgbaColor = { r: 59, g: 130, b: 246, a: 1 };

type ColorToolMode = 'color' | 'gradient';

export function ColorConvertTool() {
  const [mode, setMode] = useState<ColorToolMode>('color');
  const [color, setColor] = useState<RgbaColor>(DEFAULT_COLOR);
  const [inputValue, setInputValue] = useState(rgbaToHex(DEFAULT_COLOR));
  const [inputError, setInputError] = useState<string | null>(null);
  const [paletteType, setPaletteType] = useState<PaletteType>('shades');

  const formats = useMemo(() => rgbaToFormats(color), [color]);
  const hsl = useMemo(() => rgbaToHsl(color), [color]);
  const palette = useMemo(() => generatePalette(color, paletteType), [color, paletteType]);
  const saturationScale = useMemo(() => generateSaturationScale(color), [color]);

  useEffect(() => {
    setInputValue(rgbaToHex(color));
    setInputError(null);
  }, [color]);

  function applyColor(nextColor: RgbaColor) {
    setColor(normalizeRgba(nextColor));
  }

  function handleInputChange(value: string) {
    setInputValue(value);

    try {
      applyColor(parseColorInput(value));
      setInputError(null);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : 'Cor inválida.');
    }
  }

  function handlePickerChange(hex: string) {
    try {
      applyColor(parseColorInput(hex.startsWith('#') ? hex : `#${hex}`));
      setInputError(null);
    } catch {
      setInputError('Cor inválida no seletor.');
    }
  }

  function handleHslChange(field: 'h' | 's' | 'l', value: number) {
    const nextHsl = { ...hsl, [field]: value };
    applyColor(hslToRgba(nextHsl.h, nextHsl.s, nextHsl.l, color.a));
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Modo do conversor de cores"
        className="grid grid-cols-2 gap-2"
      >
        {([
          { value: 'color', label: 'Cor', description: 'Conversão, paleta e ajustes HSL' },
          { value: 'gradient', label: 'Degradê', description: 'Linear, radial e cônico' },
        ] as const).map((item) => {
          const isActive = mode === item.value;

          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setMode(item.value)}
              className={`min-h-11 cursor-pointer rounded-md border px-4 py-3 text-left transition-colors ${
                isActive
                  ? 'border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                  : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/80'
              }`}
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span
                className={`mt-0.5 block text-xs ${
                  isActive ? 'text-zinc-200 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {item.description}
              </span>
            </button>
          );
        })}
      </div>

      {mode === 'gradient' ? (
        <GradientBuilder currentColor={color} />
      ) : (
    <div className={TOOL_GRID_CLASS}>
      <section className="space-y-6">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
          Cor
        </h2>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <label className="space-y-2 sm:w-32">
            <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Seletor de cor</span>
            <input
              type="color"
              value={rgbaToHex(color).slice(0, 7)}
              onChange={(event) => handlePickerChange(event.target.value)}
              className="h-16 w-full cursor-pointer rounded-md border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
              aria-label="Selecionar cor"
            />
          </label>

          <div className="min-w-0 flex-1">
            <Input
              label="Informe a cor"
              hint="HEX, RGB, RGBA, HSL, HSV ou CMYK"
              value={inputValue}
              onChange={(event) => handleInputChange(event.target.value)}
              error={inputError ?? undefined}
              spellCheck={false}
              className="font-mono"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ajustes HSL</span>

          <div className="flex flex-row items-end gap-3">
            <label className="min-w-0 flex-1 space-y-1.5">
              <span className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Matiz <span className="font-mono text-zinc-500 dark:text-zinc-500">{Math.round(hsl.h)}°</span>
              </span>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={Math.round(hsl.h)}
                onChange={(event) => handleHslChange('h', Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-zinc-800 dark:accent-zinc-200"
                aria-label="Matiz"
                style={{
                  background: `linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))`,
                  borderRadius: '9999px',
                }}
              />
            </label>

            <label className="min-w-0 flex-1 space-y-1.5">
              <span className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Saturação{' '}
                <span className="font-mono text-zinc-500 dark:text-zinc-500">{Math.round(hsl.s)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(hsl.s)}
                onChange={(event) => handleHslChange('s', Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-zinc-800 dark:accent-zinc-200"
                aria-label="Saturação"
                style={{
                  background: `linear-gradient(to right, hsl(${hsl.h}, 0%, ${hsl.l}%), hsl(${hsl.h}, 100%, ${hsl.l}%))`,
                  borderRadius: '9999px',
                }}
              />
            </label>

            <label className="min-w-0 flex-1 space-y-1.5">
              <span className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Luminosidade{' '}
                <span className="font-mono text-zinc-500 dark:text-zinc-500">{Math.round(hsl.l)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(hsl.l)}
                onChange={(event) => handleHslChange('l', Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-zinc-800 dark:accent-zinc-200"
                aria-label="Luminosidade"
                style={{
                  background: `linear-gradient(to right, hsl(${hsl.h}, ${hsl.s}%, 0%), hsl(${hsl.h}, ${hsl.s}%, 50%), hsl(${hsl.h}, ${hsl.s}%, 100%))`,
                  borderRadius: '9999px',
                }}
              />
            </label>
          </div>
        </div>

        <AnimatedSelect
          label="Paleta"
          hint="Gerada a partir da cor atual."
          options={PALETTE_TYPES.map((item) => ({
            value: item.value,
            label: `${item.label}: ${item.description}`,
          }))}
          value={paletteType}
          onChange={(value) => setPaletteType(value as PaletteType)}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {palette.map((swatch) => (
            <ColorSwatch
              key={`${paletteType}-${swatch.label}`}
              label={swatch.label}
              hex={swatch.hex}
              color={rgbaToFormats(swatch.color).rgba}
              onSelect={() => applyColor(swatch.color)}
            />
          ))}
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Escala de saturação</span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {saturationScale.map((swatch) => (
              <ColorSwatch
                key={`sat-${swatch.label}`}
                label={swatch.label}
                hex={swatch.hex}
                color={rgbaToFormats(swatch.color).rgba}
                onSelect={() => applyColor(swatch.color)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4 lg:sticky lg:top-[calc(var(--header-height-compact)+1.5rem)] lg:self-start">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
          Pré-visualização
        </h2>

        <VisualStylePreview variant="solid" color={formats.rgba} hexLabel={formats.hex} />

        <div className="space-y-2">
          <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Formatos</span>
          <CopyColorRow label="HEX" value={formats.hex} />
          <CopyColorRow label="RGB" value={formats.rgb} />
          <CopyColorRow label="HSL" value={formats.hsl} />
        </div>
      </section>
    </div>
      )}
    </div>
  );
}
