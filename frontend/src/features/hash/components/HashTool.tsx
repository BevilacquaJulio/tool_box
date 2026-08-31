import { zodResolver } from '@hookform/resolvers/zod';
import { Fingerprint, Hash } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getErrorMessage } from '../../../lib/errors';
import type { HashIdentification } from '../../../lib/hash';
import {
  useGenerateHashMutation,
  useIdentifyHashMutation,
} from '../hooks/useHashMutations';
import { Button } from '../../../components/Button';
import { CopyField } from '../../../components/CopyField';
import { Input, Textarea } from '../../../components/Input';
import { TOOL_GRID_CLASS } from '../../../layout/content';

const EXAMPLE_HASH = '$2y$10$oSsMTp3D4WfjGaUbRsZmYeOkn7yYhtbOK2lM5WAMGnpg9xB/Z3MXK';

const formSchema = z.object({
  referenceHash: z.string().trim().min(1, 'Informe o hash de referência'),
  password: z.string().min(1, 'Informe a senha para gerar o novo hash'),
});

type FormValues = z.infer<typeof formSchema>;

const securityLabels: Record<string, string> = {
  strong: 'Forte',
  moderate: 'Moderado',
  weak: 'Fraco',
  insecure: 'Inseguro',
};

function ParamsList({ identification }: { identification: HashIdentification }) {
  const entries = Object.entries(identification.params).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return null;
  }

  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="min-w-0 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
        >
          <dt className="truncate font-mono text-[10px] uppercase tracking-wide text-zinc-500 sm:text-[11px]">
            {key}
          </dt>
          <dd className="mt-0.5 break-all font-mono text-sm text-zinc-950 dark:text-zinc-50">
            {String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function IdentificationCard({ identification }: { identification: HashIdentification }) {
  return (
    <section
      aria-live="polite"
      className="space-y-4 rounded-md border border-zinc-200 p-4 sm:p-5 dark:border-zinc-800"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-zinc-950 sm:text-lg dark:text-zinc-50">
            {identification.label}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {identification.description}
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-full border border-zinc-300 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-zinc-700 sm:text-xs dark:border-zinc-700 dark:text-zinc-300">
          {securityLabels[identification.securityLevel]}
        </span>
      </div>

      <ParamsList identification={identification} />

      <p className="break-all font-mono text-[11px] text-zinc-500 sm:text-xs">
        Formato: {identification.format}
      </p>

      {identification.warnings.length > 0 && (
        <ul className="space-y-1 border-t border-zinc-200 pt-3 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          {identification.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ResultsEmptyState() {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center sm:min-h-[16rem] dark:border-zinc-700">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nenhum resultado ainda</p>
      <p className="mt-1 max-w-[32ch] text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Identifique um hash ou gere um novo para ver os detalhes aqui.
      </p>
    </div>
  );
}

export function HashTool() {
  const identifyMutation = useIdentifyHashMutation();
  const generateMutation = useGenerateHashMutation();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      referenceHash: '',
      password: '',
    },
  });

  const identification = identifyMutation.data;
  const generated = generateMutation.data;
  const activeError =
    identifyMutation.error || generateMutation.error
      ? getErrorMessage(identifyMutation.error ?? generateMutation.error)
      : null;

  const hasResults = Boolean(identification || generated || activeError);

  async function onIdentify() {
    const hash = getValues('referenceHash');
    await identifyMutation.mutateAsync(hash);
  }

  async function onGenerate(values: FormValues) {
    if (!identification) {
      await identifyMutation.mutateAsync(values.referenceHash);
    }
    await generateMutation.mutateAsync({
      password: values.password,
      referenceHash: values.referenceHash,
    });
  }

  return (
      <div className={TOOL_GRID_CLASS}>
        <section className="space-y-6">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
            Entrada
          </h2>

          <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit(onGenerate)}>
            <Textarea
              label="Hash de referência"
              hint="Ex.: bcrypt PHP ($2y$), Argon2, scrypt, phpass, PBKDF2, MD5, SHA..."
              placeholder={EXAMPLE_HASH}
              error={errors.referenceHash?.message}
              spellCheck={false}
              {...register('referenceHash')}
            />

            <Button
              type="button"
              variant="ghost"
              fullWidth
              loading={identifyMutation.isPending}
              onClick={onIdentify}
            >
              <Fingerprint size={16} aria-hidden="true" />
              Identificar tipo
            </Button>

            <Input
              label="Senha para o novo hash"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              fullWidth
              loading={generateMutation.isPending || identifyMutation.isPending}
            >
              <Hash size={16} aria-hidden="true" />
              Gerar novo hash
            </Button>
          </form>
        </section>

        <section className="space-y-4 lg:sticky lg:top-[calc(var(--header-height-compact)+1.5rem)] lg:self-start">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
            Resultado
          </h2>

          {!hasResults && <ResultsEmptyState />}

          {activeError && (
            <p
              role="alert"
              className="rounded-md border border-zinc-400 bg-zinc-100 px-3 py-2.5 text-sm leading-relaxed text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {activeError}
            </p>
          )}

          {identification && <IdentificationCard identification={identification} />}

          {generated && (
            <section className="space-y-4 rounded-md border border-zinc-200 p-4 sm:p-5 dark:border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-950 sm:text-lg dark:text-zinc-50">
                Hash gerado
              </h3>
              <CopyField label={generated.label} value={generated.hash} />
              {generated.warnings.length > 0 && (
                <ul className="space-y-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {generated.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </section>
      </div>
  );
}
