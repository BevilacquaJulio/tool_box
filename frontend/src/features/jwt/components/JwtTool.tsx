import { zodResolver } from '@hookform/resolvers/zod';
import { Shuffle } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../../components/Button';
import { CopyField } from '../../../components/CopyField';
import { Input, Select } from '../../../components/Input';
import { getErrorMessage } from '../../../lib/errors';
import {
  DEFAULT_SECRET_LENGTH,
  HMAC_ALGORITHMS,
  JWT_WEIGHTS,
  MAX_SECRET_LENGTH,
  MIN_SECRET_LENGTH,
} from '../../../lib/jwt';
import { TOOL_GRID_CLASS } from '../../../layout/content';
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

function ResultsEmptyState() {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center sm:min-h-[16rem] dark:border-zinc-700">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nenhum token ainda</p>
      <p className="mt-1 max-w-[32ch] text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Escolha o peso e clique em gerar para criar um JWT aleatório compacto.
      </p>
    </div>
  );
}

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

  const result = generateMutation.data;
  const activeError = generateMutation.error ? getErrorMessage(generateMutation.error) : null;

  async function onGenerate(values: FormValues) {
    await generateMutation.mutateAsync({
      algorithm: values.algorithm,
      secretLength: values.secretLength,
    });
  }

  return (
    <div className={TOOL_GRID_CLASS}>
      <section className="space-y-6">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
          Entrada
        </h2>

        <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit(onGenerate)}>
          <Select
            label="Peso do token"
            hint="Define a força do HMAC usado na assinatura."
            error={errors.algorithm?.message}
            {...register('algorithm', {
              // Troca o tamanho para o padrão do novo algoritmo, evitando ficar abaixo do mínimo dele.
              onChange: (event) =>
                setValue(
                  'secretLength',
                  DEFAULT_SECRET_LENGTH[event.target.value as FormValues['algorithm']],
                  { shouldValidate: true },
                ),
            })}
          >
            {JWT_WEIGHTS.map((weight) => (
              <option key={weight.algorithm} value={weight.algorithm}>
                {weight.label}: {weight.description}
              </option>
            ))}
          </Select>

          <Input
            label="Tamanho do segredo (caracteres)"
            type="number"
            inputMode="numeric"
            min={MIN_SECRET_LENGTH[algorithm]}
            max={MAX_SECRET_LENGTH}
            step={1}
            hint={`Entre ${MIN_SECRET_LENGTH[algorithm]} e ${MAX_SECRET_LENGTH}. Padrão: ${DEFAULT_SECRET_LENGTH[algorithm]}.`}
            error={errors.secretLength?.message}
            {...register('secretLength', { valueAsNumber: true })}
          />

          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Gera um token JWT curto e aleatório, sem expiração.
          </p>

          <Button type="submit" fullWidth loading={generateMutation.isPending}>
            <Shuffle size={16} aria-hidden="true" />
            Gerar JWT aleatório
          </Button>
        </form>
      </section>

      <section className="space-y-4 lg:sticky lg:top-[calc(var(--header-height-compact)+1.5rem)] lg:self-start">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
          Resultado
        </h2>

        {!result && !activeError && <ResultsEmptyState />}

        {activeError && (
          <p
            role="alert"
            className="rounded-md border border-zinc-400 bg-zinc-100 px-3 py-2.5 text-sm leading-relaxed text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
          >
            {activeError}
          </p>
        )}

        {result && (
          <div className="space-y-5">
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm leading-relaxed text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              <p className="font-medium">Assinatura {result.algorithm} pronta</p>
              <p className="mt-1 text-xs text-blue-800 dark:text-blue-200">
                Copie também o segredo. Ele é necessário para verificar a assinatura e não fica
                armazenado após você sair desta página.
              </p>
            </div>

            <CopyField label="Token JWT" value={result.token} />
            <CopyField label={`Segredo de assinatura (${result.algorithm})`} value={result.secret} />
          </div>
        )}
      </section>
    </div>
  );
}
