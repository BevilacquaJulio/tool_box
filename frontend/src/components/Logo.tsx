import { useTheme } from '../hooks/useTheme';

type LogoProps = {
  className?: string;
  compact?: boolean;
};

export function Logo({ className = '', compact = false }: LogoProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (compact) {
    return (
      <span className={`inline-flex size-8 shrink-0 items-center justify-center ${className}`}>
        <img
          src="/icon.png"
          alt="Toolbox"
          width={32}
          height={32}
          className="size-7 object-contain brightness-0 dark:brightness-100"
        />
      </span>
    );
  }

  return (
    <span className={`logo-mark ${className}`}>
      <img
        src="/logo.png"
        alt=""
        aria-hidden="true"
        className="logo-mark__image"
        data-visible={!isDark}
        width={360}
        height={80}
      />
      <img
        src="/logo_white.png"
        alt="Toolbox"
        className="logo-mark__image"
        data-visible={isDark}
        width={360}
        height={80}
      />
    </span>
  );
}
