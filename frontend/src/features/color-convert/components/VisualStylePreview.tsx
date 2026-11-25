import type { CSSProperties } from 'react';

type VisualStylePreviewProps = {
  variant: 'solid' | 'gradient';
  color?: string;
  gradient?: string;
  hexLabel?: string;
};

function gradientTextStyle(gradient: string): CSSProperties {
  return {
    backgroundImage: gradient,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  };
}

function gradientFillStyle(gradient: string): CSSProperties {
  return { backgroundImage: gradient };
}

export function VisualStylePreview({
  variant,
  color,
  gradient,
  hexLabel,
}: VisualStylePreviewProps) {
  const isGradient = variant === 'gradient' && gradient;
  const solidColor = color ?? '#000000';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4">
        <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Superfície clara
        </p>

        <div className="space-y-3.5">
          <div>
            {isGradient ? (
              <h3 className="text-xl font-bold leading-snug" style={gradientTextStyle(gradient)}>
                Componente ativo
              </h3>
            ) : (
              <h3 className="text-xl font-bold leading-snug" style={{ color: solidColor }}>
                Componente ativo
              </h3>
            )}
            <p className="mt-1 text-xs leading-relaxed text-zinc-600">
              {hexLabel ? `Amostra ${hexLabel} sobre fundo claro.` : 'Amostra de degradê sobre fundo claro.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isGradient ? (
              <span
                className="inline-flex min-h-8 items-center rounded-lg px-3 text-xs font-semibold text-white"
                style={gradientFillStyle(gradient)}
              >
                Primário
              </span>
            ) : (
              <>
                <span
                  className="inline-flex min-h-8 items-center rounded-lg px-3 text-xs font-semibold text-white"
                  style={{ backgroundColor: solidColor }}
                >
                  Primário
                </span>
                <span
                  className="inline-flex min-h-8 items-center rounded-lg border px-3 text-xs font-semibold"
                  style={{ color: solidColor, borderColor: solidColor }}
                >
                  Contorno
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#0d1117] p-4">
        <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Superfície escura
        </p>

        <div className="space-y-3.5">
          <div>
            {isGradient ? (
              <h3 className="text-xl font-bold leading-snug" style={gradientTextStyle(gradient)}>
                Componente ativo
              </h3>
            ) : (
              <h3 className="text-xl font-bold leading-snug" style={{ color: solidColor }}>
                Componente ativo
              </h3>
            )}
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              {hexLabel ? `Amostra ${hexLabel} sobre fundo escuro.` : 'Amostra de degradê sobre fundo escuro.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isGradient ? (
              <span
                className="inline-flex min-h-8 items-center rounded-lg px-3 text-xs font-semibold text-white"
                style={gradientFillStyle(gradient)}
              >
                Primário
              </span>
            ) : (
              <>
                <span
                  className="inline-flex min-h-8 items-center rounded-lg px-3 text-xs font-semibold text-zinc-950"
                  style={{ backgroundColor: solidColor }}
                >
                  Primário
                </span>
                <span
                  className="inline-flex min-h-8 items-center rounded-lg border px-3 text-xs font-semibold"
                  style={{ color: solidColor, borderColor: solidColor }}
                >
                  Contorno
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
