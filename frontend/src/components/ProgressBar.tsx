type ProgressBarProps = {
  value: number;
  label: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const rounded = Math.round(clamped);

  return (
    <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-[var(--ink-secondary)]">{label}</span>
        <span className="font-mono tabular-nums text-[var(--accent)]">{rounded}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-label={label}
        className="h-1.5 overflow-hidden rounded-full bg-[var(--border-strong)]"
      >
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
