import { useEffect, useRef, useState } from 'react';

export type SimulatedProgressStage = {
  label: string;
  from: number;
  to: number;
  intervalMs?: number;
};

export type SimulatedProgressUpdate = {
  value: number;
  label: string;
};

type UseSimulatedProgressOptions = {
  isPending: boolean;
  isError?: boolean;
  stages: SimulatedProgressStage[];
  completeLabel?: string;
  clearDelayMs?: number;
};

export function useSimulatedProgress({
  isPending,
  isError = false,
  stages,
  completeLabel = 'Concluído',
  clearDelayMs = 500,
}: UseSimulatedProgressOptions): SimulatedProgressUpdate | null {
  const [progress, setProgress] = useState<SimulatedProgressUpdate | null>(null);
  const creepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPendingRef = useRef(false);

  function stopCreep() {
    if (creepTimerRef.current !== null) {
      clearInterval(creepTimerRef.current);
      creepTimerRef.current = null;
    }
  }

  function stopClearTimer() {
    if (clearTimerRef.current !== null) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }

  function clearProgress() {
    stopClearTimer();
    setProgress(null);
  }

  function startStage(stageIndex: number) {
    const stage = stages[stageIndex];
    if (!stage) {
      return;
    }

    stopCreep();

    let value = stage.from;
    setProgress({ value, label: stage.label });

    creepTimerRef.current = setInterval(() => {
      value = Math.min(value + 1, stage.to - 1);
      setProgress({ value, label: stage.label });

      if (value >= stage.to - 1) {
        stopCreep();
        const nextStage = stageIndex + 1;
        if (nextStage < stages.length) {
          startStage(nextStage);
        }
      }
    }, stage.intervalMs ?? 180);
  }

  useEffect(() => {
    if (isPending) {
      wasPendingRef.current = true;
      stopClearTimer();
      startStage(0);
      return stopCreep;
    }

    stopCreep();

    if (!wasPendingRef.current) {
      return;
    }

    wasPendingRef.current = false;

    if (isError) {
      clearProgress();
      return;
    }

    setProgress({ value: 100, label: completeLabel });
    stopClearTimer();
    clearTimerRef.current = setTimeout(() => {
      setProgress(null);
      clearTimerRef.current = null;
    }, clearDelayMs);
  }, [isPending, isError, stages, completeLabel, clearDelayMs]);

  useEffect(
    () => () => {
      stopCreep();
      stopClearTimer();
    },
    [],
  );

  return progress;
}
