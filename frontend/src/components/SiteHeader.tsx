import { Link } from 'react-router-dom';
import { APP_HEADER_INNER_CLASS } from '../layout/content';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

type SiteHeaderProps = {
  compact: boolean;
};

export function SiteHeader({ compact }: SiteHeaderProps) {
  return (
    <header className="site-header" data-compact={compact}>
      <div className={`site-header__surface ${APP_HEADER_INNER_CLASS}`}>
        <Link to="/" aria-label="Toolbox, painel inicial" className="site-header__brand focus-ring">
          <Logo />
        </Link>

        <nav className="site-header__nav" aria-label="Navegação principal">
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
