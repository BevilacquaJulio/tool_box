import type { ButtonHTMLAttributes } from 'react';
import { CircleNotch } from '@phosphor-icons/react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'focus-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out active:scale-[0.985] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45';

  const sizes = {
    sm: 'min-h-9 px-3 py-1.5 text-xs',
    md: 'min-h-10.5 px-4 py-2.5 text-sm',
  };

  const variants = {
    primary:
      'border border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)]',
    secondary:
      'border border-zinc-900 bg-zinc-900 text-white hover:border-zinc-800 hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:border-white dark:hover:bg-white',
    ghost:
      'border border-[var(--border-strong)] bg-[var(--bg-panel)] text-[var(--ink)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-subtle)]',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <CircleNotch
            size={16}
            className="animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          Processando...
        </>
      ) : (
        children
      )}
    </button>
  );
}
