import type { ButtonHTMLAttributes } from 'react';
import { CircleNotch } from '@phosphor-icons/react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45';

  const variants = {
    primary:
      'border border-brand-600 bg-brand-600 text-white shadow-[0_10px_30px_rgba(20,91,255,0.2)] hover:border-brand-700 hover:bg-brand-700 dark:border-brand-500 dark:bg-brand-500 dark:hover:border-brand-400 dark:hover:bg-brand-400',
    ghost:
      'border border-zinc-300 bg-white/65 text-zinc-950 hover:border-brand-300 hover:bg-brand-50 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-50 dark:hover:border-brand-700 dark:hover:bg-brand-950/45',
  };

  const widthClass = fullWidth ? 'w-full sm:w-auto' : '';

  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${base} ${variants[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <CircleNotch size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Processando
        </>
      ) : (
        children
      )}
    </button>
  );
}
