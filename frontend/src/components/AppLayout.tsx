import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { tools } from '../config/tools';
import { APP_MAIN_CLASS } from '../layout/content';
import { AmbientBackdrop } from './AmbientBackdrop';
import { SiteHeader } from './SiteHeader';

export function AppLayout() {
  const location = useLocation();
  const topSentinelRef = useRef<HTMLSpanElement>(null);
  const [compactHeader, setCompactHeader] = useState(false);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setCompactHeader(!entry.isIntersecting),
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (location.hash) {
      const frame = window.requestAnimationFrame(() => {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target?.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      });

      return () => window.cancelAnimationFrame(frame);
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
    setCompactHeader(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const currentTool = tools.find((tool) => tool.path === location.pathname);
    document.title = currentTool
      ? `${currentTool.title} | Toolbox`
      : 'Toolbox | Painel de utilitários';
  }, [location.pathname]);

  return (
    <div className="app-root flex min-h-[100dvh] flex-col bg-inherit text-inherit">
      <span ref={topSentinelRef} className="pointer-events-none absolute top-0 h-px w-px" />
      <AmbientBackdrop />
      <SiteHeader compact={compactHeader} />

      <main className={`relative flex-1 ${APP_MAIN_CLASS}`}>
        <div key={location.pathname} className="route-scene">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
