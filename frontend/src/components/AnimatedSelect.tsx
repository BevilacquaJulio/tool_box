import { CaretDown } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';

export type AnimatedSelectOption = {
  value: string;
  label: string;
};

type AnimatedSelectProps = {
  label: string;
  hint?: string;
  error?: string;
  options: AnimatedSelectOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  id?: string;
};

const ANIMATION_MS = 200;

export function AnimatedSelect({
  label,
  hint,
  error,
  options,
  value,
  onChange,
  onBlur,
  disabled = false,
  id,
}: AnimatedSelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const listboxId = `${fieldId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    if (isOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsMounted(false);
    }, ANIMATION_MS);

    return () => window.clearTimeout(timer);
  }, [isMounted, isOpen]);

  useEffect(() => {
    if (!isMounted || !isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        onBlur?.();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMounted, isOpen, onBlur]);

  function openMenu() {
    if (disabled || options.length === 0) {
      return;
    }

    setIsMounted(true);
    window.requestAnimationFrame(() => {
      setIsOpen(true);
    });
  }

  function closeMenu() {
    setIsOpen(false);
    onBlur?.();
  }

  function toggleMenu() {
    if (isOpen) {
      closeMenu();
      return;
    }

    openMenu();
  }

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    closeMenu();
  }

  return (
    <div className="space-y-1.5">
      <span
        id={`${fieldId}-label`}
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </span>

      <div ref={containerRef} className={`relative ${isOpen ? 'z-30' : ''}`}>
        <button
          id={fieldId}
          type="button"
          disabled={disabled || options.length === 0}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-labelledby={`${fieldId}-label`}
          onClick={toggleMenu}
          className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border bg-white px-3 py-3 text-left text-base outline-none transition-[border-color,box-shadow,background-color] duration-150 focus-visible:border-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-950/10 disabled:cursor-not-allowed disabled:opacity-40 sm:py-2.5 sm:text-sm dark:bg-zinc-900 dark:focus-visible:border-zinc-300 dark:focus-visible:ring-zinc-50/10 ${
            error
              ? 'border-zinc-500 dark:border-zinc-500'
              : 'border-zinc-300 dark:border-zinc-700'
          } ${isOpen ? 'border-zinc-950 ring-2 ring-zinc-950/10 dark:border-zinc-300 dark:ring-zinc-50/10' : ''}`}
        >
          <span className="truncate font-mono text-zinc-950 dark:text-zinc-50">
            {selectedOption?.label ?? 'Selecione...'}
          </span>
          <CaretDown
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-zinc-500 transition-transform duration-200 ease-out dark:text-zinc-400 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>

        {isMounted && (
          <ul
            id={listboxId}
            role="listbox"
            aria-labelledby={`${fieldId}-label`}
            className={`absolute top-[calc(100%+0.25rem)] right-0 left-0 z-50 max-h-60 origin-top overflow-auto rounded-md border border-zinc-300 bg-white py-1 shadow-lg shadow-zinc-950/10 transition-[opacity,transform] duration-200 ease-out will-change-transform dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/30 motion-reduce:transition-none ${
              isOpen
                ? 'pointer-events-auto translate-y-0 scale-y-100 opacity-100'
                : 'pointer-events-none -translate-y-1 scale-y-95 opacity-0'
            }`}
          >
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full cursor-pointer px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                      isSelected
                        ? 'bg-zinc-100 font-medium text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50'
                        : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <span className="font-mono">{option.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {hint && !error && (
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
      {error && <p className="text-xs text-zinc-700 dark:text-zinc-300">{error}</p>}
    </div>
  );
}
