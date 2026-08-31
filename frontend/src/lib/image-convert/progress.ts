export type ImageProgressStage =
  | 'validating'
  | 'loading-decoder'
  | 'decoding'
  | 'rendering'
  | 'encoding'
  | 'preview'
  | 'done';

export type ImageProgressUpdate = {
  value: number;
  stage: ImageProgressStage;
  label: string;
};

export type ImageProgressReporter = (update: ImageProgressUpdate) => void;

const STAGE_LABELS: Record<ImageProgressStage, string> = {
  validating: 'Validando arquivo...',
  'loading-decoder': 'Carregando decodificador...',
  decoding: 'Decodificando imagem...',
  rendering: 'Renderizando imagem...',
  encoding: 'Gerando arquivo de saída...',
  preview: 'Gerando pré-visualização...',
  done: 'Concluído',
};

export function createProgressSession(reporter?: ImageProgressReporter) {
  let creepTimer: ReturnType<typeof setInterval> | null = null;

  function emit(stage: ImageProgressStage, value: number, label = STAGE_LABELS[stage]) {
    reporter?.({
      stage,
      value: Math.min(100, Math.max(0, value)),
      label,
    });
  }

  function stopCreep() {
    if (creepTimer !== null) {
      clearInterval(creepTimer);
      creepTimer = null;
    }
  }

  function startCreep(from: number, to: number, intervalMs = 180) {
    stopCreep();
    let value = from;
    emit('decoding', value);

    creepTimer = setInterval(() => {
      value = Math.min(value + 1, to - 1);
      emit('decoding', value);
      if (value >= to - 1) {
        stopCreep();
      }
    }, intervalMs);
  }

  return {
    report: emit,
    startCreep,
    stopCreep,
    complete() {
      stopCreep();
      emit('done', 100);
    },
    dispose() {
      stopCreep();
    },
  };
}

export type ProgressSession = ReturnType<typeof createProgressSession>;
