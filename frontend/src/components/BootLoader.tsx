import { useEffect, useState } from 'react';
import { Logo } from './Logo';

type LoaderPhase = 'visible' | 'leaving' | 'hidden';

export function BootLoader() {
  const [phase, setPhase] = useState<LoaderPhase>('visible');

  useEffect(() => {
    let active = true;
    let hasStartedLeaving = false;
    const timers: number[] = [];

    const wait = (duration: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, duration));
      });

    const fontsReady = document.fonts?.ready.catch(() => undefined) ?? Promise.resolve();

    function leave() {
      if (!active || hasStartedLeaving) {
        return;
      }

      hasStartedLeaving = true;
      setPhase('leaving');
      timers.push(
        window.setTimeout(() => {
          if (active) {
            setPhase('hidden');
          }
        }, 480),
      );
    }

    Promise.race([Promise.all([wait(850), fontsReady]), wait(2200)]).then(leave);

    return () => {
      active = false;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  if (phase === 'hidden') {
    return null;
  }

  return (
    <div className="boot-loader" data-phase={phase}>
      <div className="boot-loader__content" aria-hidden="true">
        <Logo className="boot-loader__logo" />
        <div className="boot-loader__track">
          <span className="boot-loader__progress" />
        </div>
        <p>Carregando...</p>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        Carregando Toolbox
      </span>
    </div>
  );
}
