import { useEffect, useMemo, useState } from 'react';
import { AnimatedSelect } from '../../../components/AnimatedSelect';
import { Input } from '../../../components/Input';
import { StudioPanel } from '../../../components/PageShell';
import { TOOL_GRID_CLASS } from '../../../layout/content';
import {
  calculateContrast,
  generatePalette,
  generateSaturationScale,
  hslToRgba,
  normalizeRgba,
  PALETTE_TYPES,
  parseColorInput,
  rgbaToFormats,
  rgbaToHex,
  rgbaToHsl,
  WCAG_LABELS,
  type PaletteType,
  type RgbaColor,
} from '../../../lib/color-convert';
import { ColorSwatch, CopyColorRow } from './CopyColorRow';
import { GradientBuilder } from './GradientBuilder';
import { VisualStylePreview } from './VisualStylePreview';

const DEFAULT_COLOR: RgbaColor = { r: 20, g: 125, b: 120, a: 1 };
const LIGHT_BG: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };
const DARK_BG: RgbaColor = { r: 13, g: 17, b: 23, a: 1 };

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

  const lightContrast = useMemo(() => calculateContrast(color, LIGHT_BG), [color]);
  const darkContrast = useMemo(() => calculateContrast(color, DARK_BG), [color]);

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
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Modo do laboratório de cores"
        className="studio-panel grid grid-cols-2 gap-1.5 p-1.5"
      >
        {(
          [
            {
              value: 'color',
              label: 'Cor, contraste e paletas',
              description: 'HEX, RGB, HSL, HSV, CMYK e WCAG',
            },
            {
              value: 'gradient',
              label: 'Construtor de degradê',
              description: 'Linear, radial e cônico com exportação CSS/Tailwind/PNG',
            },
          ] as const
        ).map((item) => {
          const isActive = mode === item.value;

          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setMode(item.value)}
              className={`focus-ring cursor-pointer rounded-xl px-4 py-2.5 text-left transition-colors duration-150 ${
                isActive
                  ? 'border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--ink)]'
                  : 'border border-transparent text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink)]'
              }`}
            >
              <span className="block text-xs font-semibold sm:text-sm">{item.label}</span>
              <span className="mt-0.5 hidden text-xs text-[var(--ink-muted)] sm:block">
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
          <StudioPanel title="Entrada e harmonia">
            <div className="space-y-5">
              <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start">
                <label className="space-y-1.5 sm:w-28">
                  <span className="block text-xs font-medium text-[var(--ink-secondary)]">
                    Amostra
                  </span>
                  <input
                    type="color"
                    value={rgbaToHex(color).slice(0, 7)}
                    onChange={(event) => handlePickerChange(event.target.value)}
                    className="h-11 w-full cursor-pointer rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] p-1"
                    aria-label="Selecionar cor"
                  />
                </label>

                <div className="min-w-0 flex-1">
                  <Input
                    label="Valor da cor"
                    hint="Aceita HEX (#147D78), rgb(), rgba(), hsl(), hsv() ou cmyk()"
                    value={inputValue}
                    onChange={(event) => handleInputChange(event.target.value)}
                    error={inputError ?? undefined}
                    spellCheck={false}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5">
                <span className="block text-xs font-medium text-[var(--ink-secondary)]">
                  Canais HSL
                </span>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="space-y-1.5">
                    <span className="flex items-center justify-between text-[11px] font-medium text-[var(--ink-muted)]">
                      <span>Matiz</span>
                      <span className="font-mono text-[var(--ink)]">{Math.round(hsl.h)}°</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={Math.round(hsl.h)}
                      onChange={(event) => handleHslChange('h', Number(event.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full"
                      aria-label="Matiz"
                      style={{
                        background:
                          'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))',
                      }}
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="flex items-center justify-between text-[11px] font-medium text-[var(--ink-muted)]">
                      <span>Saturação</span>
                      <span className="font-mono text-[var(--ink)]">{Math.round(hsl.s)}%</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(hsl.s)}
                      onChange={(event) => handleHslChange('s', Number(event.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full"
                      aria-label="Saturação"
                      style={{
                        background: `linear-gradient(to right, hsl(${hsl.h}, 0%, ${hsl.l}%), hsl(${hsl.h}, 100%, ${hsl.l}%))`,
                      }}
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="flex items-center justify-between text-[11px] font-medium text-[var(--ink-muted)]">
                      <span>Luminosidade</span>
                      <span className="font-mono text-[var(--ink)]">{Math.round(hsl.l)}%</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(hsl.l)}
                      onChange={(event) => handleHslChange('l', Number(event.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full"
                      aria-label="Luminosidade"
                      style={{
                        background: `linear-gradient(to right, hsl(${hsl.h}, ${hsl.s}%, 0%), hsl(${hsl.h}, ${hsl.s}%, 50%), hsl(${hsl.h}, ${hsl.s}%, 100%))`,
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                    Contraste no branco
                  </span>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-[var(--ink)]">
                      {lightContrast.ratioFormatted}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--accent)]">
                      {WCAG_LABELS[lightContrast.normalText]}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                    Contraste no escuro
                  </span>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-[var(--ink)]">
                      {darkContrast.ratioFormatted}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--accent)]">
                      {WCAG_LABELS[darkContrast.normalText]}
                    </span>
                  </div>
                </div>
              </div>

              <AnimatedSelect
                label="Harmonia de paleta"
                options={PALETTE_TYPES.map((item) => ({
                  value: item.value,
                  label: `${item.label}: ${item.description}`,
                }))}
                value={paletteType}
                onChange={(value) => setPaletteType(value as PaletteType)}
              />

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
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
                <span className="block text-xs font-medium text-[var(--ink-secondary)]">
                  Escala de saturação
                </span>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
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
            </div>
          </StudioPanel>

          <div className="lg:sticky lg:top-[calc(var(--topbar-height)+1.25rem)] lg:self-start">
            <StudioPanel
              title="Formatos e simulação"
              badge={
                <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink)]">
                  {formats.hex}
                </span>
              }
            >
              <div className="space-y-4">
                <VisualStylePreview
                  variant="solid"
                  color={formats.rgba}
                  hexLabel={formats.hex}
                />

                <div className="space-y-2">
                  <CopyColorRow label="HEX" value={formats.hex} />
                  <CopyColorRow label="RGB" value={formats.rgb} />
                  <CopyColorRow label="HSL" value={formats.hsl} />
                  <CopyColorRow label="HSV" value={formats.hsv} />
                  <CopyColorRow label="CMYK" value={formats.cmyk} />
                </div>
              </div>
            </StudioPanel>
          </div>
        </div>
      )}
    </div>
  );
}
