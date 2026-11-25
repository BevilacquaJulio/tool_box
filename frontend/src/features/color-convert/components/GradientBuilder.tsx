import { ArrowDown, ArrowUp, DownloadSimple, Plus, Trash } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { AnimatedSelect } from '../../../components/AnimatedSelect';
import { Button } from '../../../components/Button';
import { StudioPanel } from '../../../components/PageShell';
import { TOOL_GRID_CLASS } from '../../../layout/content';
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
    const fallbackColor = currentColor ? rgbaToHex(currentColor) : '#3FBAB3';
    const nextPosition =
      stops.length === 0 ? 0 : Math.min(100, Math.round(stops[stops.length - 1].position + 15));

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
    <div className={TOOL_GRID_CLASS}>
      <StudioPanel
        title="Paradas e geometria"
        actions={
          <Button type="button" variant="ghost" size="sm" onClick={addStop}>
            <Plus size={13} aria-hidden="true" />
            Adicionar cor
          </Button>
        }
      >
        <div className="space-y-5">
          <AnimatedSelect
            label="Tipo de degradê"
            options={GRADIENT_TYPES.map((item) => ({ value: item.value, label: item.label }))}
            value={type}
            onChange={(value) => setType(value as GradientType)}
          />

          <div className="space-y-2">
            <span className="block text-xs font-medium text-[var(--ink-secondary)]">
              Paradas de cor ({stops.length})
            </span>

            {stops.map((stop, index) => (
              <div
                key={stop.id}
                className="flex flex-col gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <input
                    type="color"
                    value={stop.color.slice(0, 7)}
                    onChange={(event) =>
                      updateStop(stop.id, { color: event.target.value.toUpperCase() })
                    }
                    className="size-9 shrink-0 cursor-pointer rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] p-0.5"
                    aria-label={`Cor ${index + 1}`}
                  />
                  <input
                    type="text"
                    value={stop.color}
                    onChange={(event) => updateStop(stop.id, { color: event.target.value })}
                    spellCheck={false}
                    aria-label={`Código da cor ${index + 1}`}
                    className="min-w-0 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] px-2.5 py-1.5 font-mono text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <label className="flex w-full shrink-0 flex-col gap-1 sm:w-32">
                  <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                    Posição {stop.position}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={stop.position}
                    onChange={(event) =>
                      updateStop(stop.id, { position: Number(event.target.value) })
                    }
                    className="h-1.5 w-full cursor-pointer"
                    aria-label={`Posição da cor ${index + 1}`}
                  />
                </label>

                <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => moveStop(stop.id, 'up')}
                    disabled={index === 0}
                    aria-label={`Mover cor ${index + 1} para cima`}
                    className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowUp size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStop(stop.id, 'down')}
                    disabled={index === stops.length - 1}
                    aria-label={`Mover cor ${index + 1} para baixo`}
                    className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowDown size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStop(stop.id)}
                    disabled={stops.length <= 2}
                    aria-label={`Remover cor ${index + 1}`}
                    className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash size={13} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5 sm:grid-cols-3">
            {(type === 'linear' || type === 'conic') && (
              <label className="space-y-1.5">
                <span className="block text-xs font-medium text-[var(--ink-secondary)]">
                  {type === 'linear' ? 'Ângulo' : 'Rotação'}{' '}
                  <span className="font-mono text-[var(--ink-muted)]">{angle}°</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={angle}
                  onChange={(event) => setAngle(Number(event.target.value))}
                  className="h-1.5 w-full cursor-pointer"
                  aria-label={
                    type === 'linear' ? 'Direção do degradê' : 'Rotação do degradê cônico'
                  }
                />
              </label>
            )}

            {(type === 'radial' || type === 'conic') && (
              <>
                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-[var(--ink-secondary)]">
                    Eixo X <span className="font-mono text-[var(--ink-muted)]">{centerX}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={centerX}
                    onChange={(event) => setCenterX(Number(event.target.value))}
                    className="h-1.5 w-full cursor-pointer"
                    aria-label="Posição horizontal do centro"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-[var(--ink-secondary)]">
                    Eixo Y <span className="font-mono text-[var(--ink-muted)]">{centerY}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={centerY}
                    onChange={(event) => setCenterY(Number(event.target.value))}
                    className="h-1.5 w-full cursor-pointer"
                    aria-label="Posição vertical do centro"
                  />
                </label>
              </>
            )}
          </div>
        </div>
      </StudioPanel>

      <div className="lg:sticky lg:top-[calc(var(--topbar-height)+1.25rem)] lg:self-start">
        <StudioPanel title="Pré-visualização e código">
          <div className="space-y-4">
            <div
              className="h-28 w-full rounded-xl border border-black/10 shadow-inner dark:border-white/10"
              style={{ backgroundImage: outputs.css }}
              aria-label="Amostra contínua do degradê"
            />

            <VisualStylePreview variant="gradient" gradient={outputs.css} />

            <div className="space-y-2">
              <CopyColorRow label="CSS" value={`background-image: ${outputs.css};`} />
              <CopyColorRow
                label="Texto"
                value={`background-image: ${outputs.css}; -webkit-background-clip: text; background-clip: text; color: transparent;`}
              />
              <CopyColorRow label="Tailwind" value={outputs.tailwind} />
            </div>

            <Button
              type="button"
              variant="secondary"
              fullWidth
              loading={isDownloading}
              onClick={() => void handleDownloadPng()}
            >
              <DownloadSimple size={16} aria-hidden="true" />
              Exportar PNG
            </Button>
          </div>
        </StudioPanel>
      </div>
    </div>
  );
}
