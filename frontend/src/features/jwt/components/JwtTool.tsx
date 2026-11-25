import { zodResolver } from '@hookform/resolvers/zod';
import { Key, Shuffle } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../../components/Button';
import { CopyField } from '../../../components/CopyField';
import { Input } from '../../../components/Input';
import { StudioAlert, StudioEmptyState, StudioPanel } from '../../../components/PageShell';
import { TOOL_GRID_CLASS } from '../../../layout/content';
import { getErrorMessage } from '../../../lib/errors';
import {
  DEFAULT_SECRET_LENGTH,
  HMAC_ALGORITHMS,
  JWT_WEIGHTS,
  MAX_SECRET_LENGTH,
  MIN_SECRET_LENGTH,
} from '../../../lib/jwt';
import { useGenerateRandomJwtMutation } from '../hooks/useJwtMutations';

const formSchema = z
  .object({
    algorithm: z.enum(HMAC_ALGORITHMS),
    secretLength: z
      .number({ invalid_type_error: 'Informe a quantidade de caracteres' })
      .int('Use um número inteiro')
      .max(MAX_SECRET_LENGTH, `Máximo de ${MAX_SECRET_LENGTH} caracteres`),
  })
  .superRefine(({ algorithm, secretLength }, ctx) => {
    const min = MIN_SECRET_LENGTH[algorithm];
    if (secretLength < min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['secretLength'],
        message: `${algorithm} exige no mínimo ${min} caracteres`,
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

const PRESET_LENGTHS = [32, 64, 128, 256, 512] as const;

export function JwtTool() {
  const generateMutation = useGenerateRandomJwtMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      algorithm: 'HS256',
      secretLength: DEFAULT_SECRET_LENGTH.HS256,
    },
  });

  const algorithm = watch('algorithm');
  const secretLength = watch('secretLength');
  const minSecret = MIN_SECRET_LENGTH[algorithm];

  const result = generateMutation.data;
  const activeError = generateMutation.error ? getErrorMessage(generateMutation.error) : null;

  function selectAlgorithm(nextAlg: FormValues['algorithm']) {
    setValue('algorithm', nextAlg, { shouldValidate: true });
    setValue('secretLength', DEFAULT_SECRET_LENGTH[nextAlg], { shouldValidate: true });
  }

  async function onGenerate(values: FormValues) {
    await generateMutation.mutateAsync({
      algorithm: values.algorithm,
      secretLength: values.secretLength,
    });
  }

  const availablePresets = Array.from(
    new Set([minSecret, ...PRESET_LENGTHS.filter((len) => len >= minSecret)]),
  );

  return (
    <div className={TOOL_GRID_CLASS}>
      <StudioPanel title="Parâmetros de assinatura">
        <form className="space-y-5" onSubmit={handleSubmit(onGenerate)}>
          <div className="space-y-2">
            <span className="block text-xs font-medium text-[var(--ink-secondary)]">
              Algoritmo HMAC
            </span>

            <div
              role="radiogroup"
              aria-label="Algoritmo HMAC"
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              {JWT_WEIGHTS.map((weight) => {
                const active = algorithm === weight.algorithm;
                return (
                  <button
                    key={weight.algorithm}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => selectAlgorithm(weight.algorithm)}
                    className={`focus-ring flex cursor-pointer flex-col rounded-xl border p-3 text-left transition-colors duration-150 ${
                      active
                        ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--ink)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-[var(--accent)]">
                        {weight.algorithm}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                        mín. {MIN_SECRET_LENGTH[weight.algorithm]}
                      </span>
                    </div>
                    <span className="mt-1 text-xs font-semibold text-[var(--ink)]">
                      {weight.label}
                    </span>
                    <span className="mt-0.5 text-[11px] leading-snug text-[var(--ink-muted)]">
                      {weight.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <Input
              label="Tamanho do segredo (caracteres)"
              type="number"
              inputMode="numeric"
              min={minSecret}
              max={MAX_SECRET_LENGTH}
              step={1}
              hint={`Intervalo aceito para ${algorithm}: ${minSecret} até ${MAX_SECRET_LENGTH} caracteres.`}
              error={errors.secretLength?.message}
              {...register('secretLength', { valueAsNumber: true })}
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                Presets:
              </span>
              {availablePresets.map((preset) => {
                const isSelected = secretLength === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setValue('secretLength', preset, { shouldValidate: true })}
                    className={`focus-ring cursor-pointer rounded-md border px-2 py-1 font-mono text-[11px] transition-colors ${
                      isSelected
                        ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] font-medium text-[var(--ink)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" fullWidth loading={generateMutation.isPending}>
            <Shuffle size={16} aria-hidden="true" />
            Gerar JWT aleatório
          </Button>
        </form>
      </StudioPanel>

      <div className="lg:sticky lg:top-[calc(var(--topbar-height)+1.25rem)] lg:self-start">
        <StudioPanel
          title="Token e segredo"
          badge={
            result ? (
              <span className="rounded border border-[var(--accent-border)] bg-[var(--accent-soft)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--ink)]">
                {result.algorithm}
              </span>
            ) : undefined
          }
        >
          <div className="space-y-4">
            {!result && !activeError && (
              <StudioEmptyState
                icon={Key}
                title="Nenhum JWT gerado"
                description="Selecione o algoritmo HMAC e o comprimento do segredo para emitir um token compacto de teste."
              />
            )}

            {activeError && <StudioAlert variant="error">{activeError}</StudioAlert>}

            {result && (
              <div className="space-y-4">
                <StudioAlert variant="info" title={`Assinatura ${result.algorithm} emitida`}>
                  Guarde o segredo junto com o token caso precise validar a assinatura no backend.
                  Nada é persistido ao sair desta tela.
                </StudioAlert>

                <CopyField label="Token JWT" value={result.token} />
                <CopyField
                  label={`Segredo HMAC (${result.algorithm})`}
                  value={result.secret}
                />
              </div>
            )}
          </div>
        </StudioPanel>
      </div>
    </div>
  );
}
