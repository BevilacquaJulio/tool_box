import type { ReactNode } from 'react';
import { ArrowLeft, CloudArrowDown, ShieldCheck } from '@phosphor-icons/react';
import { Link, useLocation } from 'react-router-dom';
import { tools } from '../config/tools';

type ToolSandboxProps = {
  children: ReactNode;
  className?: string;
};

/** Área útil compartilhada por todos os mini serviços. */
export function ToolSandbox({ children, className = '' }: ToolSandboxProps) {
  return (
    <div
      className={`tool-workspace relative w-full min-w-0 rounded-[1.75rem] border border-zinc-200/80 bg-white/78 p-3 shadow-[0_28px_90px_rgba(18,73,145,0.09)] backdrop-blur-sm sm:p-6 lg:p-8 dark:border-zinc-800/90 dark:bg-zinc-950/72 dark:shadow-[0_28px_90px_rgba(0,0,0,0.24)] ${className}`}
    >
      {children}
    </div>
  );
}

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div
      className={`mx-auto flex w-full max-w-[1180px] min-w-0 flex-col gap-6 sm:gap-8 lg:gap-10 ${className}`}
    >
      {children}
    </div>
  );
}

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="w-full space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
        {eyebrow}
      </p>
      <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-zinc-950 sm:text-4xl lg:text-5xl dark:text-zinc-50">
        {title}
      </h1>
      <p className="max-w-[65ch] text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400">
        {description}
      </p>
    </header>
  );
}

type ToolPageLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ToolPageLayout({
  title,
  description,
  children,
}: ToolPageLayoutProps) {
  const location = useLocation();
  const tool = tools.find((item) => item.path === location.pathname);
  const Icon = tool?.icon;
  const isHybrid = tool?.processing === 'hybrid';

  return (
    <PageShell>
      <Link to="/" className="tool-back-link focus-ring">
        <ArrowLeft size={17} aria-hidden="true" />
        Catálogo
      </Link>

      <header className="tool-page-header">
        {Icon && (
          <span className="tool-page-header__icon" aria-hidden="true">
            <Icon size={28} weight="duotone" />
          </span>
        )}
        <div className="min-w-0">
          <div className="tool-page-header__status">
            {isHybrid ? (
              <CloudArrowDown size={15} aria-hidden="true" />
            ) : (
              <ShieldCheck size={15} aria-hidden="true" />
            )}
            {isHybrid ? 'Credenciais enviadas apenas para teste via API' : 'Processamento local'}
          </div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>

      <ToolSandbox>{children}</ToolSandbox>
    </PageShell>
  );
}
