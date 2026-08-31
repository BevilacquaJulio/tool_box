import { ArrowDown, ArrowUp, DownloadSimple, Plus, Trash } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { AnimatedSelect } from '../../../components/AnimatedSelect';
import {
  buildGradientOutputs,
  createDefaultGradientStops,
  downloadGradientPng,
  GRADIENT_TYPES,
  rgbaToHex,
  type GradientConfig,
  type GradientStop,
  type GradientType,
  type RgbaColor,
} from '../../../lib/color-convert';
import { CopyColorRow } from './CopyColorRow';
import { VisualStylePreview } from './VisualStylePreview';

type GradientBuilderProps = {
  currentColor?: RgbaColor;
};

export function GradientBuilder({ currentColor }: GradientBuilderProps) {
  const [type, setType] = useState<GradientType>('linear');
  const [stops, setStops] = useState<GradientStop[]>(() => createDefaultGradientStops());
  const [angle, setAngle] = useState(90);
  const [centerX, setCenterX] = useState(50);
  const [centerY, setCenterY] = useState(50);
  const [isDownloading, setIsDownloading] = useState(false);

  const config = useMemo<GradientConfig>(
    () => ({
      type,
      stops,
      angle,
      centerX,
      centerY,
    }),
    [type, stops, angle, centerX, centerY],
  );

  const outputs = useMemo(() => buildGradientOutputs(config), [config]);

  function updateStop(id: string, patch: Partial<GradientStop>) {
    setStops((current) => current.map((stop) => (stop.id === id ? { ...stop, ...patch } : stop)));
  }

  function addStop() {
    const fallbackColor = currentColor ? rgbaToHex(currentColor) : '#FFFFFF';
    const nextPosition =
      stops.length === 0 ? 0 : Math.min(100, Math.round(stops[stops.length - 1].position + 10));

    setStops((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        color: fallbackColor,
        position: nextPosition,
      },
    ]);
  }

  function removeStop(id: string) {
    setStops((current) => {
      if (current.length <= 2) {
        return current;
      }
      return current.filter((stop) => stop.id !== id);
    });
  }

  function moveStop(id: string, direction: 'up' | 'down') {
    setStops((current) => {
      const index = current.findIndex((stop) => stop.id === id);
      if (index === -1) {
        return current;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  async function handleDownloadPng() {
    setIsDownloading(true);
    try {
      await downloadGradientPng(config);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <AnimatedSelect
        label="Tipo de degradê"
        options={GRADIENT_TYPES.map((item) => ({ value: item.value, label: item.label }))}
        value={type}
        onChange={(value) => setType(value as GradientType)}
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Cores</span>
          <button
            type="button"
            onClick={addStop}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Plus size={14} aria-hidden="true" />
            Adicionar cor
          </button>
        </div>

        <div className="space-y-2">
          {stops.map((stop, index) => (
            <div
              key={stop.id}
              className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <input
                  type="color"
                  value={stop.color.slice(0, 7)}
                  onChange={(event) => updateStop(stop.id, { color: event.target.value.toUpperCase() })}
                  className="h-10 w-10 shrink-0 cursor-pointer rounded-md border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900"
                  aria-label={`Cor ${index + 1}`}
                />
                <input
                  type="text"
                  value={stop.color}
                  onChange={(event) => updateStop(stop.id, { color: event.target.value })}
                  spellCheck={false}
                  aria-label={`Código da cor ${index + 1}`}
                  className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-950 outline-none transition-[border-color,box-shadow] focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-50/10"
                />
              </div>

              <label className="flex w-full shrink-0 flex-col gap-1 sm:w-36">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Posição {stop.position}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={stop.position}
                  onChange={(event) => updateStop(stop.id, { position: Number(event.target.value) })}
                  className="h-2 w-full cursor-pointer accent-zinc-800 dark:accent-zinc-200"
                  aria-label={`Posição da cor ${index + 1}`}
                />
              </label>

              <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => moveStop(stop.id, 'up')}
                  disabled={index === 0}
                  aria-label={`Mover cor ${index + 1} para cima`}
                  className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border border-zinc-300 text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <ArrowUp size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => moveStop(stop.id, 'down')}
                  disabled={index === stops.length - 1}
                  aria-label={`Mover cor ${index + 1} para baixo`}
                  className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border border-zinc-300 text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <ArrowDown size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => removeStop(stop.id)}
                  disabled={stops.length <= 2}
                  aria-label={`Remover cor ${index + 1}`}
                  className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border border-zinc-300 text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Trash size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(type === 'linear' || type === 'conic') && (
          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {type === 'linear' ? 'Direção' : 'Rotação'} ({angle}°)
            </span>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={angle}
              onChange={(event) => setAngle(Number(event.target.value))}
              className="h-2 w-full cursor-pointer accent-zinc-800 dark:accent-zinc-200"
              aria-label={type === 'linear' ? 'Direção do degradê' : 'Rotação do degradê cônico'}
            />
          </label>
        )}

        {(type === 'radial' || type === 'conic') && (
          <>
            <label className="space-y-1.5">
              <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Posição X ({centerX}%)
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={centerX}
                onChange={(event) => setCenterX(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-zinc-800 dark:accent-zinc-200"
                aria-label="Posição horizontal do centro"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Posição Y ({centerY}%)
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={centerY}
                onChange={(event) => setCenterY(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-zinc-800 dark:accent-zinc-200"
                aria-label="Posição vertical do centro"
              />
            </label>
          </>
        )}
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Pré-visualização</span>
        <VisualStylePreview variant="gradient" gradient={outputs.css} />
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Formatos</span>
        <CopyColorRow label="CSS" value={`background-image: ${outputs.css};`} />
        <CopyColorRow
          label="CSS texto"
          value={`background-image: ${outputs.css}; -webkit-background-clip: text; background-clip: text; color: transparent;`}
        />
        <CopyColorRow label="Tailwind" value={outputs.tailwind} />

        <button
          type="button"
          onClick={() => void handleDownloadPng()}
          disabled={isDownloading}
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          <DownloadSimple size={16} aria-hidden="true" />
          {isDownloading ? 'Gerando PNG...' : 'Baixar PNG'}
        </button>
      </div>
    </div>
  );
}
