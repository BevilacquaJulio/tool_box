import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';

type PasswordInputProps = {
  label: string;
  hint?: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const fieldClass =
  'w-full rounded-xl border border-zinc-300 bg-white/82 px-3.5 py-3 pr-11 text-base text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/12 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900/72 dark:text-zinc-50 dark:shadow-none dark:focus:border-brand-400 dark:focus:bg-zinc-900 dark:focus:ring-brand-400/14';

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
        className="block cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          autoComplete="off"
          className={`${fieldClass} font-mono ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="focus-ring absolute inset-y-0 right-0 inline-flex w-11 cursor-pointer items-center justify-center rounded-r-xl text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
        >
          {visible ? <EyeSlash size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {hint && !error && <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{hint}</p>}
      {error && <p className="text-xs text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}
