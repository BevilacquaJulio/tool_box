import type { DiffRow } from '../../../lib/text-diff';
import { renderCharParts } from '../../../lib/text-diff';

function escapePlainText(text: string): string {
  return renderCharParts([{ value: text, type: 'unchanged' }]);
}

const ROW_STYLES: Record<DiffRow['type'], { left: string; right: string }> = {
  unchanged: {
    left: 'bg-[var(--bg-panel)]',
    right: 'bg-[var(--bg-panel)]',
  },
  removed: {
    left: 'bg-red-500/8 dark:bg-red-950/30',
    right: 'bg-[var(--bg-subtle)]/70',
  },
  added: {
    left: 'bg-[var(--bg-subtle)]/70',
    right: 'bg-emerald-500/8 dark:bg-emerald-950/30',
  },
  modified: {
    left: 'bg-amber-500/6 dark:bg-amber-950/20',
    right: 'bg-amber-500/6 dark:bg-amber-950/20',
  },
};

type DiffPanelProps = {
  rows: DiffRow[];
};

function LineContent({
  text,
  html,
  className,
}: {
  text: string | null;
  html?: string;
  className: string;
}) {
  if (text === null && !html) {
    return <td className={`${className} text-[var(--ink-muted)]/40`}>&nbsp;</td>;
  }

  const contentHtml = html ?? escapePlainText(text ?? '');

  return (
    <td className={className}>
      <pre className="overflow-x-auto px-3 py-1 font-mono text-[11px] leading-relaxed text-[var(--ink)] sm:text-xs">
        <code dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </pre>
    </td>
  );
}

export function DiffPanel({ rows }: DiffPanelProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-left font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
              <th className="w-12 border-r border-[var(--border-subtle)] px-2.5 py-2 text-right">#</th>
              <th className="min-w-[16rem] border-r border-[var(--border-subtle)] px-3 py-2 sm:min-w-[24rem]">
                Original (A)
              </th>
              <th className="w-12 border-r border-[var(--border-subtle)] px-2.5 py-2 text-right">#</th>
              <th className="min-w-[16rem] px-3 py-2 sm:min-w-[24rem]">Comparação (B)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const styles = ROW_STYLES[row.type];

              return (
                <tr
                  key={`${row.type}-${index}`}
                  className="border-b border-[var(--border-subtle)] last:border-b-0"
                >
                  <td className="select-none border-r border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 px-2.5 py-1 text-right font-mono text-[10px] tabular-nums text-[var(--ink-muted)] sm:text-[11px]">
                    {row.leftLineNumber ?? ''}
                  </td>
                  <LineContent
                    text={row.leftText}
                    html={row.leftHtml}
                    className={`${styles.left} border-r border-[var(--border-subtle)]`}
                  />
                  <td className="select-none border-r border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 px-2.5 py-1 text-right font-mono text-[10px] tabular-nums text-[var(--ink-muted)] sm:text-[11px]">
                    {row.rightLineNumber ?? ''}
                  </td>
                  <LineContent text={row.rightText} html={row.rightHtml} className={styles.right} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
