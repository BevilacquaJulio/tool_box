import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { tools } from '../config/tools';
import { WorkbenchPreferencesProvider } from '../hooks/useWorkbenchPreferences';
import { APP_MAIN_CLASS } from '../layout/content';
import { AmbientBackdrop } from './AmbientBackdrop';
import { CommandPalette } from './CommandPalette';
import { SidebarNav } from './SidebarNav';
import { SiteHeader } from './SiteHeader';

function AppShellInner() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);

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
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const currentTool = tools.find((tool) => tool.path === location.pathname);
    document.title = currentTool ? `${currentTool.title} · Toolbox` : 'Toolbox';
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-[100dvh] w-full bg-inherit text-inherit">
      <AmbientBackdrop />

      <SidebarNav
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="relative z-10 flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        <SiteHeader onOpenMobileNav={() => setMobileNavOpen(true)} />

        <main className={`relative ${APP_MAIN_CLASS}`}>
          <div key={location.pathname} className="route-scene">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}

export function AppLayout() {
  return (
    <WorkbenchPreferencesProvider>
      <AppShellInner />
    </WorkbenchPreferencesProvider>
  );
}
