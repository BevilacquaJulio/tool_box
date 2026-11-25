import { CheckCircle, WarningCircle, XCircle } from '@phosphor-icons/react';
import type { DbVerifyCheck, DbVerifyResult } from '../db-verify.types';

function StatusIcon({ status }: { status: DbVerifyCheck['status'] }) {
  if (status === 'passed') {
    return (
      <CheckCircle
        size={17}
        weight="fill"
        className="shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-hidden="true"
      />
    );
  }

  if (status === 'warning') {
    return (
      <WarningCircle
        size={17}
        weight="fill"
        className="shrink-0 text-amber-600 dark:text-amber-400"
        aria-hidden="true"
      />
    );
  }

  return (
    <XCircle
      size={17}
      weight="fill"
      className="shrink-0 text-red-600 dark:text-red-400"
      aria-hidden="true"
    />
  );
}

export function DbVerifyResultPanel({ result }: { result: DbVerifyResult }) {
  return (
    <section
      id="db-verify-result"
      aria-live="polite"
      className="studio-panel scroll-mt-6 overflow-hidden"
    >
      <div
        className={`flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
          result.success
            ? 'border-emerald-500/25 bg-emerald-500/8'
            : 'border-red-500/25 bg-red-500/8'
        }`}
      >
        <div className="flex min-w-0 items-start gap-3">
          {result.success ? (
            <CheckCircle
              size={22}
              weight="fill"
              className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
          ) : (
            <XCircle
              size={22}
              weight="fill"
              className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--ink)]">
                {result.success ? 'Conexão válida' : 'Conexão inválida'}
              </h2>
              {!result.success && result.errorLabel && (
                <span className="rounded-md border border-red-500/35 bg-[var(--bg-panel)] px-2 py-0.5 font-mono text-[11px] font-medium text-red-700 dark:text-red-300">
                  {result.errorLabel}
                </span>
              )}
            </div>
            <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-[var(--ink-secondary)] sm:text-sm">
              {result.summary}
            </p>
          </div>
        </div>

        <span className="w-fit shrink-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-1 font-mono text-xs tabular-nums text-[var(--ink-secondary)]">
          {result.totalDurationMs} ms
        </span>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        {result.success && result.metadata && (
          <div className="space-y-2">
            <h3 className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
              Telemetria do servidor
            </h3>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
              <MetadataItem label="Versão" value={result.metadata.serverVersion} />
              <MetadataItem label="Banco" value={result.metadata.activeDatabase ?? 'n/d'} />
              <MetadataItem label="Charset" value={result.metadata.charset ?? 'n/d'} />
              <MetadataItem label="Collation" value={result.metadata.collation ?? 'n/d'} />
              <MetadataItem label="Conn. ID" value={String(result.metadata.connectionId ?? 'n/d')} />
              <MetadataItem
                label="Max conn."
                value={String(result.metadata.maxConnections ?? 'n/d')}
              />
              <MetadataItem label="Tabelas" value={String(result.metadata.tableCount ?? 'n/d')} />
              <MetadataItem label="TLS" value={result.metadata.tlsVersion ?? 'Desativado'} />
            </dl>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
            Etapas de verificação ({result.checks.length})
          </h3>
          <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {result.checks.map((check) => (
              <li
                key={`${check.id}-${check.label}`}
                className="flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5"
              >
                <div className="flex items-start gap-2.5">
                  <StatusIcon status={check.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--ink)] sm:text-sm">
                        {check.label}
                      </p>
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">
                        {check.durationMs} ms
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">
                      {check.message}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-2">
      <dt className="truncate font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
        {label}
      </dt>
      <dd
        className="mt-0.5 truncate font-mono text-xs font-medium text-[var(--ink)]"
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
