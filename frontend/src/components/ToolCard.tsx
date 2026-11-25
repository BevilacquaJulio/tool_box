import {
  ArrowUpRight,
  PlugsConnected,
  PushPin,
  ShieldCheck,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import type { ToolDefinition } from '../config/tools';

type ToolCardProps = {
  tool: ToolDefinition;
  pinned?: boolean;
  onTogglePin?: (toolId: string) => void;
  compact?: boolean;
};

export function ToolCard({
  tool,
  pinned = false,
  onTogglePin,
  compact = false,
}: ToolCardProps) {
  const Icon = tool.icon;
  const isLocal = tool.processing === 'local';

  if (compact) {
    return (
      <div className="group relative flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[var(--bg-subtle)] sm:gap-4 sm:px-5">
        <Link
          to={tool.path}
          className="focus-ring flex min-w-0 flex-1 items-center gap-3.5 rounded-lg sm:gap-4"
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--accent)] transition-colors group-hover:border-[var(--accent-border)] group-hover:bg-[var(--accent-soft)]">
            <Icon size={18} weight="duotone" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-[var(--ink)]">{tool.title}</h3>
              <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]">
                {tool.category}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-[var(--ink-muted)]">
              {tool.shortDescription}
            </p>
          </div>

          <div className="hidden shrink-0 items-center gap-1.5 xl:flex">
            {tool.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>

          <span className="hidden shrink-0 items-center gap-1 font-mono text-[11px] text-[var(--ink-muted)] md:inline-flex">
            {isLocal ? (
              <ShieldCheck size={13} className="text-[var(--accent)]" aria-hidden="true" />
            ) : (
              <PlugsConnected size={13} className="text-[var(--accent)]" aria-hidden="true" />
            )}
            {isLocal ? 'Local' : 'API'}
          </span>

          <kbd className="hidden shrink-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)] sm:inline-block">
            Alt+{tool.shortcutNumber}
          </kbd>

          <ArrowUpRight
            size={16}
            aria-hidden="true"
            className="shrink-0 text-[var(--ink-muted)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--accent)]"
          />
        </Link>

        {onTogglePin && (
          <button
            type="button"
            onClick={() => onTogglePin(tool.id)}
            aria-pressed={pinned}
            aria-label={pinned ? `Desafixar ${tool.title}` : `Fixar ${tool.title}`}
            title={pinned ? 'Desafixar' : 'Fixar'}
            className={`focus-ring inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
              pinned
                ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-transparent text-[var(--ink-muted)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-panel)] hover:text-[var(--ink)]'
            }`}
          >
            <PushPin size={14} weight={pinned ? 'fill' : 'regular'} aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }

  return (
    <article className="studio-panel group relative flex h-full flex-col transition-[border-color,transform,box-shadow] duration-150 hover:border-[var(--accent-border)]">
      <Link
        to={tool.path}
        className="focus-ring flex flex-1 flex-col rounded-2xl p-4 sm:p-5"
      >
        <div className="flex items-start justify-between gap-3 pr-9">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--accent)] transition-colors duration-150 group-hover:border-[var(--accent-border)] group-hover:bg-[var(--accent-soft)]">
              <Icon size={20} weight="duotone" aria-hidden="true" />
            </span>

            <div>
              <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
                {tool.category}
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-[var(--ink-secondary)]">
                {isLocal ? (
                  <ShieldCheck size={12} className="text-[var(--accent)]" aria-hidden="true" />
                ) : (
                  <PlugsConnected size={12} className="text-[var(--accent)]" aria-hidden="true" />
                )}
                {isLocal ? 'Local' : 'API interna'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex-1">
          <h3 className="text-base font-semibold tracking-tight text-[var(--ink)] group-hover:text-[var(--accent)]">
            {tool.title}
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-muted)]">
            {tool.shortDescription}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3.5">
          <div className="flex min-w-0 flex-wrap gap-1">
            {tool.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
            <span className="hidden sm:inline">Alt+{tool.shortcutNumber}</span>
            <ArrowUpRight
              size={15}
              aria-hidden="true"
              className="transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--accent)]"
            />
          </span>
        </div>
      </Link>

      {onTogglePin && (
        <button
          type="button"
          onClick={() => onTogglePin(tool.id)}
          aria-pressed={pinned}
          aria-label={pinned ? `Desafixar ${tool.title}` : `Fixar ${tool.title}`}
          title={pinned ? 'Desafixar do acesso rápido' : 'Fixar no acesso rápido'}
          className={`focus-ring absolute top-3.5 right-3.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border transition-colors duration-150 active:scale-[0.96] sm:top-4 sm:right-4 ${
            pinned
              ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/80 text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink)]'
          }`}
        >
          <PushPin size={14} weight={pinned ? 'fill' : 'regular'} aria-hidden="true" />
        </button>
      )}
    </article>
  );
}
