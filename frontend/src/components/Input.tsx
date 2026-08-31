import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
};

const fieldClass =
  'w-full rounded-xl border border-zinc-300 bg-white/82 px-3.5 py-3 text-base text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/12 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900/72 dark:text-zinc-50 dark:shadow-none dark:focus:border-brand-400 dark:focus:bg-zinc-900 dark:focus:ring-brand-400/14';

export function Input({
  label,
  hint,
  error,
  id,
  className = '',
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={fieldId}
        className="block cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      <input id={fieldId} className={`${fieldClass} font-mono ${className}`} {...props} />
      {hint && !error && <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{hint}</p>}
      {error && <p className="text-xs text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  hint,
  error,
  id,
  className = '',
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={fieldId}
        className="block cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      <select id={fieldId} className={`${fieldClass} cursor-pointer ${className}`} {...props}>
        {children}
      </select>
      {hint && !error && <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{hint}</p>}
      {error && <p className="text-xs text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}

export function Textarea({
  label,
  hint,
  error,
  id,
  className = '',
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={fieldId}
        className="block cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      <textarea
        id={fieldId}
        className={`min-h-32 w-full resize-y font-mono leading-relaxed placeholder:text-zinc-400 placeholder:opacity-45 sm:min-h-28 dark:placeholder:text-zinc-500 dark:placeholder:opacity-50 ${fieldClass} ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{hint}</p>}
      {error && <p className="text-xs text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}
