import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  labelTrailing?: ReactNode;
  mono?: boolean;
};

const baseFieldClass =
  'w-full rounded-lg border bg-[var(--bg-subtle)] px-3.5 py-2.5 text-base text-[var(--ink)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[var(--ink-muted)]/65 focus:bg-[var(--bg-panel)] sm:text-sm';

const normalBorderClass =
  'border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-soft)]';

const errorBorderClass =
  'border-red-500/80 focus:border-red-500 focus:ring-3 focus:ring-red-500/15';

export function Input({
  label,
  hint,
  error,
  labelTrailing,
  mono = true,
  id,
  className = '',
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={fieldId}
          className="block cursor-pointer text-xs font-medium text-[var(--ink-secondary)]"
        >
          {label}
        </label>
        {labelTrailing}
      </div>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={`${baseFieldClass} ${error ? errorBorderClass : normalBorderClass} ${
          mono ? 'font-mono' : ''
        } ${className}`}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

export function Select({
  label,
  hint,
  error,
  labelTrailing,
  id,
  className = '',
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={fieldId}
          className="block cursor-pointer text-xs font-medium text-[var(--ink-secondary)]"
        >
          {label}
        </label>
        {labelTrailing}
      </div>
      <select
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={`${baseFieldClass} ${
          error ? errorBorderClass : normalBorderClass
        } cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
      {hint && !error && (
        <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  hint,
  error,
  labelTrailing,
  mono = true,
  id,
  className = '',
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={fieldId}
          className="block cursor-pointer text-xs font-medium text-[var(--ink-secondary)]"
        >
          {label}
        </label>
        {labelTrailing}
      </div>
      <textarea
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={`min-h-32 resize-y leading-relaxed sm:min-h-28 ${baseFieldClass} ${
          error ? errorBorderClass : normalBorderClass
        } ${mono ? 'font-mono text-xs sm:text-[13px]' : ''} ${className}`}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
