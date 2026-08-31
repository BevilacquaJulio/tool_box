import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
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
  }, 'Porta invalida');

const formSchema = z.object({
  host: z.string().trim().min(1, 'Informe o host'),
  port: portSchema,
  database: z.string().trim().min(1, 'Informe o nome do banco'),
  username: z.string().trim().min(1, 'Informe o usuario'),
  password: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function DbVerifyTool() {
  const mutation = useDbVerifyMutation();
  const resultRef = useRef<HTMLDivElement>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      host: '',
      port: '',
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
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <Input
              label="Host"
              placeholder="ex.: localhost ou db.exemplo.com"
              autoComplete="off"
              spellCheck={false}
              error={errors.host?.message}
              {...register('host')}
            />
          </div>

          <div className="xl:col-span-2">
            <Input
              label="Porta"
              placeholder="ex.: 3306"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              error={errors.port?.message}
              {...register('port')}
            />
          </div>

          <div className="xl:col-span-5">
            <Input
              label="Nome do banco"
              placeholder="ex.: nome_do_banco"
              autoComplete="off"
              spellCheck={false}
              error={errors.database?.message}
              {...register('database')}
            />
          </div>

          <div className="xl:col-span-4">
            <Input
              label="Usuario"
              placeholder="ex.: usuario"
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
              Testar conexao
            </Button>
          </div>
        </div>

        {mutation.isError && (
          <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            {getErrorMessage(mutation.error)}
          </p>
        )}
      </form>

      <div ref={resultRef}>
        {mutation.data ? (
          <DbVerifyResultPanel result={mutation.data} />
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-8 text-center dark:border-zinc-700">
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Informe os dados de conexao e execute o teste. O resultado aparece aqui, abaixo do formulario, com o tipo
              de erro quando a conexao falhar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
