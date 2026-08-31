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

export function VisualStylePreview({ variant, color, gradient, hexLabel }: VisualStylePreviewProps) {
  const isGradient = variant === 'gradient' && gradient;
  const solidColor = color ?? '#000000';

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Fundo claro</p>

        <div className="space-y-5">
          <div className="space-y-3">
            {isGradient ? (
              <h3 className="text-3xl font-bold leading-tight sm:text-4xl" style={gradientTextStyle(gradient)}>
                Título com degradê
              </h3>
            ) : (
              <h3 className="text-3xl font-bold leading-tight sm:text-4xl" style={{ color: solidColor }}>
                Título colorido
              </h3>
            )}

            <p className="max-w-sm text-sm leading-relaxed text-zinc-600">
              Veja como a cor aparece em texto corrido, ações e elementos de interface.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isGradient ? (
              <>
                <span
                  className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-white shadow-sm"
                  style={gradientFillStyle(gradient)}
                >
                  Botão primário
                </span>
                <span
                  className="inline-flex min-h-10 items-center rounded-md bg-white px-4 text-sm font-semibold"
                  style={gradientTextStyle(gradient)}
                >
                  Texto em destaque
                </span>
              </>
            ) : (
              <>
                <span
                  className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-white shadow-sm"
                  style={{ backgroundColor: solidColor }}
                >
                  Botão primário
                </span>
                <span
                  className="inline-flex min-h-10 items-center rounded-md border px-4 text-sm font-semibold"
                  style={{ color: solidColor, borderColor: solidColor }}
                >
                  Contorno
                </span>
              </>
            )}

            <span
              className="inline-flex min-h-8 items-center rounded-full px-3 text-xs font-medium text-white"
              style={isGradient ? gradientFillStyle(gradient) : { backgroundColor: solidColor }}
            >
              Badge
            </span>
          </div>

          {isGradient ? (
            <div className="rounded-lg p-[2px]" style={gradientFillStyle(gradient)}>
              <div className="rounded-[6px] bg-white p-4">
                <p className="text-sm font-medium text-zinc-800">Card com borda em degradê</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {hexLabel ? `${hexLabel} em componentes reais.` : 'Elemento com destaque visual.'}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="rounded-lg border border-zinc-200 border-l-4 bg-zinc-50 p-4"
              style={{ borderLeftColor: solidColor }}
            >
              <p className="text-sm font-medium text-zinc-800">Card de exemplo</p>
              <p className="mt-1 text-xs text-zinc-500">
                {hexLabel ? `${hexLabel} aplicado em componentes reais.` : 'Elemento com destaque visual.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
        <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">Fundo escuro</p>

        <div className="space-y-5">
          <div className="space-y-3">
            {isGradient ? (
              <h3 className="text-3xl font-bold leading-tight sm:text-4xl" style={gradientTextStyle(gradient)}>
                Título com degradê
              </h3>
            ) : (
              <h3 className="text-3xl font-bold leading-tight sm:text-4xl" style={{ color: solidColor }}>
                Título colorido
              </h3>
            )}

            <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
              Mesma cor em contexto escuro, útil para validar contraste e legibilidade.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isGradient ? (
              <span
                className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-white"
                style={gradientFillStyle(gradient)}
              >
                Botão primário
              </span>
            ) : (
              <span
                className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-zinc-950"
                style={{ backgroundColor: solidColor }}
              >
                Botão primário
              </span>
            )}

            {isGradient ? (
              <span
                className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold"
                style={gradientTextStyle(gradient)}
              >
                Link em destaque
              </span>
            ) : (
              <span
                className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold"
                style={{ color: solidColor }}
              >
                Link em destaque
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
