import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';

type PasswordInputProps = {
  label: string;
  hint?: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const baseFieldClass =
  'w-full rounded-lg border bg-[var(--bg-subtle)] px-3.5 py-2.5 pr-11 font-mono text-base text-[var(--ink)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[var(--ink-muted)]/65 focus:bg-[var(--bg-panel)] sm:text-sm';

export function PasswordInput({
  label,
  hint,
  error,
  id,
  className = '',
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={fieldId}
        className="block cursor-pointer text-xs font-medium text-[var(--ink-secondary)]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          className={`${baseFieldClass} ${
            error
              ? 'border-red-500/80 focus:border-red-500 focus:ring-3 focus:ring-red-500/15'
              : 'border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-soft)]'
          } ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="focus-ring absolute inset-y-0 right-0 inline-flex w-10 cursor-pointer items-center justify-center rounded-r-lg text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeSlash size={17} aria-hidden="true" />
          ) : (
            <Eye size={17} aria-hidden="true" />
          )}
        </button>
      </div>
      {hint && !error && (
        <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
