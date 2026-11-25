import { CaretDown, Check } from '@phosphor-icons/react';
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

const ANIMATION_MS = 180;

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
    if (!isMounted || isOpen) {
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
        className="block text-xs font-medium text-[var(--ink-secondary)]"
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
          className={`flex min-h-10.5 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border bg-[var(--bg-subtle)] px-3.5 py-2.5 text-left text-base outline-none transition-[border-color,box-shadow,background-color] duration-150 focus-visible:border-[var(--accent)] focus-visible:bg-[var(--bg-panel)] focus-visible:ring-3 focus-visible:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm ${
            error
              ? 'border-red-500/80'
              : 'border-[var(--border-strong)] hover:border-[var(--accent-border)]'
          } ${
            isOpen
              ? 'border-[var(--accent)] bg-[var(--bg-panel)] ring-3 ring-[var(--accent-soft)]'
              : ''
          }`}
        >
          <span className="truncate font-mono text-[var(--ink)]">
            {selectedOption?.label ?? 'Selecione...'}
          </span>
          <CaretDown
            size={15}
            aria-hidden="true"
            className={`shrink-0 text-[var(--ink-muted)] transition-transform duration-200 ease-out ${
              isOpen ? 'rotate-180 text-[var(--accent)]' : 'rotate-0'
            }`}
          />
        </button>

        {isMounted && (
          <ul
            id={listboxId}
            role="listbox"
            aria-labelledby={`${fieldId}-label`}
            className={`absolute top-[calc(100%+0.35rem)] right-0 left-0 z-50 max-h-64 origin-top overflow-auto rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-1 shadow-xl transition-[opacity,transform] duration-150 ease-out will-change-transform motion-reduce:transition-none ${
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
                    className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-100 ${
                      isSelected
                        ? 'bg-[var(--accent-soft)] font-medium text-[var(--ink)]'
                        : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <span className="truncate font-mono text-xs sm:text-sm">{option.label}</span>
                    {isSelected && (
                      <Check
                        size={14}
                        weight="bold"
                        className="shrink-0 text-[var(--accent)]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
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
