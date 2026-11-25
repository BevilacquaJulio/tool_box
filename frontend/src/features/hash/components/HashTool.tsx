import { zodResolver } from '@hookform/resolvers/zod';
import {
  Eraser,
  Fingerprint,
  Hash,
  ShieldCheck,
  ShieldWarning,
  Sparkle,
} from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../../components/Button';
import { CopyField } from '../../../components/CopyField';
import { Textarea } from '../../../components/Input';
import { StudioAlert, StudioEmptyState, StudioPanel } from '../../../components/PageShell';
import { PasswordInput } from '../../../components/PasswordInput';
import { TOOL_GRID_CLASS } from '../../../layout/content';
import { getErrorMessage } from '../../../lib/errors';
import type { HashIdentification } from '../../../lib/hash';
import {
  useGenerateHashMutation,
  useIdentifyHashMutation,
} from '../hooks/useHashMutations';

const EXAMPLE_HASH = '$2y$10$oSsMTp3D4WfjGaUbRsZmYeOkn7yYhtbOK2lM5WAMGnpg9xB/Z3MXK';

const formSchema = z.object({
  referenceHash: z.string().trim().min(1, 'Informe o hash de referência'),
  password: z.string().min(1, 'Informe a senha para gerar o novo hash'),
});

type FormValues = z.infer<typeof formSchema>;

const securityConfig: Record<
  HashIdentification['securityLevel'],
  { label: string; className: string; strong: boolean }
> = {
  strong: {
    label: 'Forte',
    className:
      'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    strong: true,
  },
  moderate: {
    label: 'Moderado',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    strong: false,
  },
  weak: {
    label: 'Fraco',
    className: 'border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300',
    strong: false,
  },
  insecure: {
    label: 'Inseguro',
    className: 'border-red-500/45 bg-red-500/12 text-red-700 dark:text-red-300',
    strong: false,
  },
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
          className="min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2"
        >
          <dt className="truncate font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
            {key}
          </dt>
          <dd className="mt-0.5 break-all font-mono text-xs font-medium text-[var(--ink)] sm:text-sm">
            {String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function IdentificationCard({ identification }: { identification: HashIdentification }) {
  const security = securityConfig[identification.securityLevel];

  return (
    <div
      aria-live="polite"
      className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--ink)] sm:text-base">
            {identification.label}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)] sm:text-sm">
            {identification.description}
          </p>
        </div>

        <span
          className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] font-medium ${security.className}`}
        >
          {security.strong ? (
            <ShieldCheck size={13} aria-hidden="true" />
          ) : (
            <ShieldWarning size={13} aria-hidden="true" />
          )}
          {security.label}
        </span>
      </div>

      <ParamsList identification={identification} />

      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
        <span className="font-mono text-[11px] text-[var(--ink-muted)]">
          Formato: <strong className="font-medium text-[var(--ink)]">{identification.format}</strong>
        </span>
      </div>

      {identification.warnings.length > 0 && (
        <ul className="space-y-1.5 border-t border-[var(--border-subtle)] pt-3 text-xs leading-relaxed text-[var(--ink-muted)]">
          {identification.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-2">
              <ShieldWarning
                size={14}
                className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      )}
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
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      referenceHash: '',
      password: '',
    },
  });

  const referenceValue = watch('referenceHash');
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

  async function handleFillExample() {
    setValue('referenceHash', EXAMPLE_HASH, { shouldDirty: true, shouldValidate: true });
    generateMutation.reset();
    await identifyMutation.mutateAsync(EXAMPLE_HASH);
  }

  function handleClear() {
    reset({ referenceHash: '', password: '' });
    identifyMutation.reset();
    generateMutation.reset();
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
      <StudioPanel
        title="Entrada"
        actions={
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => void handleFillExample()}>
              <Sparkle size={13} aria-hidden="true" />
              Exemplo bcrypt
            </Button>
            {(referenceValue || hasResults) && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
                <Eraser size={13} aria-hidden="true" />
                Limpar
              </Button>
            )}
          </>
        }
      >
        <form className="space-y-5" onSubmit={handleSubmit(onGenerate)}>
          <Textarea
            label="Hash de referência"
            hint="Suporta bcrypt ($2a$/$2b$/$2y$), Argon2, scrypt, PBKDF2, phpass, MySQL, MD5, SHA e outros."
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
            disabled={!referenceValue.trim()}
            onClick={() => void onIdentify()}
          >
            <Fingerprint size={16} aria-hidden="true" />
            Identificar algoritmo
          </Button>

          <div className="border-t border-[var(--border-subtle)] pt-5">
            <PasswordInput
              label="Senha para gerar novo hash"
              hint="Usa exatamente o algoritmo e os parâmetros de custo detectados no hash acima."
              placeholder="Digite a senha de teste..."
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <Button
            type="submit"
            fullWidth
            loading={generateMutation.isPending || identifyMutation.isPending}
          >
            <Hash size={16} aria-hidden="true" />
            Gerar hash compatível
          </Button>
        </form>
      </StudioPanel>

      <div className="lg:sticky lg:top-[calc(var(--topbar-height)+1.25rem)] lg:self-start">
        <StudioPanel title="Inspeção e resultado">
          <div className="space-y-4">
            {!hasResults && (
              <StudioEmptyState
                icon={Fingerprint}
                title="Aguardando hash"
                description="Cole um hash existente para inspecionar o algoritmo e os parâmetros ou gere um novo hash compatível."
              />
            )}

            {activeError && <StudioAlert variant="error">{activeError}</StudioAlert>}

            {identification && <IdentificationCard identification={identification} />}

            {generated && (
              <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4">
                <h3 className="text-sm font-semibold text-[var(--ink)]">Novo hash gerado</h3>
                <CopyField label={generated.label} value={generated.hash} />
                {generated.warnings.length > 0 && (
                  <ul className="space-y-1 text-xs leading-relaxed text-[var(--ink-muted)]">
                    {generated.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </StudioPanel>
      </div>
    </div>
  );
}
