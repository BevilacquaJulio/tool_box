type ProgressBarProps = {
  value: number;
  label: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const rounded = Math.round(clamped);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">{rounded}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-label={label}
        className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div
          className="h-full rounded-full bg-zinc-950 transition-[width] duration-300 ease-out dark:bg-zinc-50"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
