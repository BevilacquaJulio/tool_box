import type { DiffRow } from '../../../lib/text-diff';
import { renderCharParts } from '../../../lib/text-diff';

function escapePlainText(text: string): string {
  return renderCharParts([{ value: text, type: 'unchanged' }]);
}

const ROW_STYLES: Record<DiffRow['type'], { left: string; right: string }> = {
  unchanged: {
    left: 'bg-white dark:bg-zinc-950',
    right: 'bg-white dark:bg-zinc-950',
  },
  removed: {
    left: 'bg-red-50/50 dark:bg-red-950/15',
    right: 'bg-zinc-50 dark:bg-zinc-900/40',
  },
  added: {
    left: 'bg-zinc-50 dark:bg-zinc-900/40',
    right: 'bg-emerald-50/50 dark:bg-emerald-950/15',
  },
  modified: {
    left: 'bg-white dark:bg-zinc-950',
    right: 'bg-white dark:bg-zinc-950',
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
    return <td className={`${className} text-zinc-300 dark:text-zinc-700`}>&nbsp;</td>;
  }

  const contentHtml = html ?? escapePlainText(text ?? '');

  return (
    <td className={className}>
      <pre className="overflow-x-auto px-3 py-1 font-mono text-[11px] leading-relaxed text-zinc-950 sm:text-xs dark:text-zinc-50">
        <code dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </pre>
    </td>
  );
}

export function DiffPanel({ rows }: DiffPanelProps) {
  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <th className="w-12 px-2 py-2">#</th>
              <th className="min-w-[16rem] px-2 py-2 sm:min-w-[24rem]">Original</th>
              <th className="w-12 px-2 py-2">#</th>
              <th className="min-w-[16rem] px-2 py-2 sm:min-w-[24rem]">Comparação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const styles = ROW_STYLES[row.type];

              return (
                <tr key={`${row.type}-${index}`} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="select-none px-2 py-1 text-right font-mono text-[10px] text-zinc-400 sm:text-[11px]">
                    {row.leftLineNumber ?? ''}
                  </td>
                  <LineContent text={row.leftText} html={row.leftHtml} className={styles.left} />
                  <td className="select-none px-2 py-1 text-right font-mono text-[10px] text-zinc-400 sm:text-[11px]">
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
