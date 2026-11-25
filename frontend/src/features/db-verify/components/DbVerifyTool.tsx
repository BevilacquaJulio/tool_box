import { zodResolver } from '@hookform/resolvers/zod';
import { Database, PlugsConnected } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { StudioAlert, StudioEmptyState, StudioPanel } from '../../../components/PageShell';
import { PasswordInput } from '../../../components/PasswordInput';
import { getErrorMessage } from '../../../lib/errors';
import { useDbVerifyMutation } from '../hooks/useDbVerifyMutation';
import { DbVerifyResultPanel } from './DbVerifyResultPanel';

const portSchema = z
  .string()
  .trim()
  .min(1, 'Informe a porta')
  .refine((value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535;
  }, 'Porta inválida');

const formSchema = z.object({
  host: z.string().trim().min(1, 'Informe o host'),
  port: portSchema,
  database: z.string().trim().min(1, 'Informe o nome do banco'),
  username: z.string().trim().min(1, 'Informe o usuário'),
  password: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function DbVerifyTool() {
  const mutation = useDbVerifyMutation();
  const resultRef = useRef<HTMLDivElement>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      host: '',
      port: '3306',
      database: '',
      username: '',
      password: '',
    },
  });

  useEffect(() => {
    if (mutation.data && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [mutation.data]);

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({
      host: values.host,
      port: Number(values.port),
      database: values.database,
      username: values.username,
      password: values.password ?? '',
    });
  });

  return (
    <div className="space-y-5">
      <StudioPanel
        title="Credenciais de teste (MySQL / MariaDB)"
        subtitle="Credenciais descartadas imediatamente após o diagnóstico"
      >
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
            <div className="xl:col-span-5">
              <Input
                label="Host ou IP"
                placeholder="db.exemplo.com ou 10.0.0.5"
                autoComplete="off"
                spellCheck={false}
                error={errors.host?.message}
                {...register('host')}
              />
            </div>

            <div className="xl:col-span-2">
              <Input
                label="Porta"
                placeholder="3306"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                error={errors.port?.message}
                labelTrailing={
                  <button
                    type="button"
                    onClick={() => setValue('port', '3306', { shouldValidate: true })}
                    className="cursor-pointer font-mono text-[10px] text-[var(--accent)] hover:underline"
                  >
                    padrão 3306
                  </button>
                }
                {...register('port')}
              />
            </div>

            <div className="xl:col-span-5">
              <Input
                label="Banco de dados (schema)"
                placeholder="app_production"
                autoComplete="off"
                spellCheck={false}
                error={errors.database?.message}
                {...register('database')}
              />
            </div>

            <div className="xl:col-span-4">
              <Input
                label="Usuário"
                placeholder="app_user"
                autoComplete="off"
                spellCheck={false}
                error={errors.username?.message}
                {...register('username')}
              />
            </div>

            <div className="xl:col-span-5">
              <PasswordInput
                label="Senha"
                placeholder="Opcional"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <div className="flex items-end xl:col-span-3">
              <Button type="submit" loading={mutation.isPending} fullWidth>
                <PlugsConnected size={16} aria-hidden="true" />
                Testar conexão
              </Button>
            </div>
          </div>

          {mutation.isError && (
            <StudioAlert variant="error">{getErrorMessage(mutation.error)}</StudioAlert>
          )}
        </form>
      </StudioPanel>

      <div ref={resultRef}>
        {mutation.data ? (
          <DbVerifyResultPanel result={mutation.data} />
        ) : (
          <StudioPanel title="Relatório de diagnóstico">
            <StudioEmptyState
              icon={Database}
              title="Nenhuma verificação executada"
              description="Preencha host, porta, banco e usuário para validar conectividade TCP, TLS, ping, schema, privilégios e escrita temporária."
            />
          </StudioPanel>
        )}
      </div>
    </div>
  );
}
