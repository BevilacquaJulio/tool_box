import { CheckCircle, WarningCircle, XCircle } from '@phosphor-icons/react';
import type { DbVerifyCheck, DbVerifyResult } from '../db-verify.types';

function StatusIcon({ status }: { status: DbVerifyCheck['status'] }) {
  if (status === 'passed') {
    return <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
  }

  if (status === 'warning') {
    return <WarningCircle size={16} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />;
  }

  return <XCircle size={16} className="text-red-600 dark:text-red-400" aria-hidden="true" />;
}

export function DbVerifyResultPanel({ result }: { result: DbVerifyResult }) {
  return (
    <section
      id="db-verify-result"
      aria-live="polite"
      className={`scroll-mt-6 space-y-4 rounded-2xl border p-4 sm:p-5 ${
        result.success
          ? 'border-emerald-300/80 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20'
          : 'border-red-300/80 bg-red-50/70 dark:border-red-900 dark:bg-red-950/20'
      }`}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
              Resultado
            </p>
            {!result.success && result.errorLabel && (
              <span className="rounded-full border border-red-300 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                Falha: {result.errorLabel}
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {result.success ? 'Conexao valida' : 'Conexao invalida'}
          </h2>
          <p className="max-w-4xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{result.summary}</p>
        </div>
        <p className="shrink-0 font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {result.totalDurationMs} ms
        </p>
      </div>

      {result.success && result.metadata && (
        <dl className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-7">
          <MetadataItem label="Versao" value={result.metadata.serverVersion} />
          <MetadataItem label="Banco" value={result.metadata.activeDatabase ?? '—'} />
          <MetadataItem label="Charset" value={result.metadata.charset ?? '—'} />
          <MetadataItem label="Collation" value={result.metadata.collation ?? '—'} />
          <MetadataItem label="Conn. ID" value={String(result.metadata.connectionId ?? '—')} />
          <MetadataItem label="Max conn." value={String(result.metadata.maxConnections ?? '—')} />
          <MetadataItem label="Tabelas" value={String(result.metadata.tableCount ?? '—')} />
        </dl>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Verificacoes</h3>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {result.checks.map((check) => (
            <li
              key={`${check.id}-${check.label}`}
              className="rounded-xl border border-zinc-200/90 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/50"
            >
              <div className="flex items-start gap-2">
                <StatusIcon status={check.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">{check.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {check.message}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-zinc-500">{check.durationMs} ms</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200/90 bg-white/70 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-950/50">
      <dt className="truncate font-mono text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-xs text-zinc-950 dark:text-zinc-50" title={value}>
        {value}
      </dd>
    </div>
  );
}
