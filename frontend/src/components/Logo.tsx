import { useTheme } from '../hooks/useTheme';

type LogoProps = {
  className?: string;
};

export function Logo({ className = '' }: LogoProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
