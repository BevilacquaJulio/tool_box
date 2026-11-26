import type { ReactNode } from 'react';
import {
  CheckCircle,
  Info,
  PlugsConnected,
  ShieldCheck,
  WarningCircle,
  type Icon,
} from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { tools } from '../config/tools';

type ToolSandboxProps = {
  children: ReactNode;
  className?: string;
};

/** Container da área de trabalho da ferramenta. */
export function ToolSandbox({ children, className = '' }: ToolSandboxProps) {
  return <div className={`w-full min-w-0 ${className}`}>{children}</div>;
}

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div className={`mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-5 ${className}`}>
      {children}
    </div>
  );
}

type StudioPanelProps = {
  title?: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

/** Módulo visual padronizado para painéis de entrada, configuração e resultado. */
export function StudioPanel({
  title,
  subtitle,
  badge,
  actions,
  children,
  className = '',
  bodyClassName = '',
}: StudioPanelProps) {
  const hasHeader = Boolean(title || subtitle || badge || actions);

  return (
    <section className={`studio-panel min-w-0 overflow-visible ${className}`}>
      {hasHeader && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {title && (
              <h2 className="font-mono text-xs font-medium uppercase tracking-wider text-[var(--ink-secondary)]">
                {title}
              </h2>
            )}
            {badge}
            {subtitle && (
              <span className="hidden truncate text-xs text-[var(--ink-muted)] sm:inline">
                {subtitle}
              </span>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`p-4 sm:p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

type StudioEmptyStateProps = {
  icon?: Icon;
  title: string;
  description: string;
};

export function StudioEmptyState({ icon: Icon, title, description }: StudioEmptyStateProps) {
  return (
    <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)]/65 px-5 py-8 text-center">
      {Icon && (
        <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--accent)]">
          <Icon size={20} weight="duotone" aria-hidden="true" />
        </span>
      )}
      <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
      <p className="mt-1 max-w-[34ch] text-xs leading-relaxed text-[var(--ink-muted)]">
        {description}
      </p>
    </div>
  );
}

type StudioAlertProps = {
  variant?: 'error' | 'success' | 'info' | 'warning';
  title?: string;
  children: ReactNode;
};

export function StudioAlert({ variant = 'info', title, children }: StudioAlertProps) {
  const styles = {
    error:
      'border-red-500/35 bg-red-500/8 text-red-900 dark:border-red-400/30 dark:bg-red-950/35 dark:text-red-200',
    success:
      'border-emerald-500/35 bg-emerald-500/8 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950/35 dark:text-emerald-200',
    warning:
      'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/35 dark:text-amber-200',
    info: 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--ink)]',
  };

  const Icon =
    variant === 'error' || variant === 'warning'
      ? WarningCircle
      : variant === 'success'
        ? CheckCircle
        : Info;

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed ${styles[variant]}`}
    >
      <Icon size={18} weight="duotone" className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5 text-xs opacity-90' : ''}>{children}</div>
      </div>
    </div>
  );
}

type ToolPageLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ToolPageLayout({ title, description, children }: ToolPageLayoutProps) {
  const location = useLocation();
  const tool = tools.find((item) => item.path === location.pathname);
  const Icon = tool?.icon;
  const isHybrid = tool?.processing === 'hybrid';

  return (
    <PageShell>
      <header className="studio-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
          {Icon && (
            <span
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
              aria-hidden="true"
            >
              <Icon size={22} weight="duotone" />
            </span>
          )}

          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-[var(--ink)] sm:text-xl">
              {title}
            </h1>
            <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-[var(--ink-muted)] sm:text-sm">
              {description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 font-mono text-[11px] text-[var(--ink-secondary)]">
            {isHybrid ? (
              <>
                <PlugsConnected size={14} className="text-[var(--accent)]" aria-hidden="true" />
                Via API interna
              </>
            ) : (
              <>
                <ShieldCheck size={14} className="text-[var(--accent)]" aria-hidden="true" />
                100% no navegador
              </>
            )}
          </span>

          {tool && (
            <kbd className="hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2 py-1 font-mono text-[11px] text-[var(--ink-muted)] xl:inline-block">
              Alt+{tool.shortcutNumber}
            </kbd>
          )}
        </div>
      </header>

      <ToolSandbox>{children}</ToolSandbox>
    </PageShell>
  );
}
