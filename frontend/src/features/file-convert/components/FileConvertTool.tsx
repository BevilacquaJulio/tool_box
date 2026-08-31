import { lazy, Suspense, useState } from 'react';
import { ImageConvertTool } from '../../image-convert/components/ImageConvertTool';
import { ConvertModeSelector, type ConvertMode } from './ConvertModeSelector';

const DocumentConvertTool = lazy(async () => {
  const module = await import('../../document-convert/components/DocumentConvertTool');
  return { default: module.DocumentConvertTool };
});

function ModeLoadingState() {
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">Carregando modo de documentos...</p>
  );
}

export function FileConvertTool() {
  const [mode, setMode] = useState<ConvertMode>('images');

  return (
    <div className="space-y-6">
      <ConvertModeSelector value={mode} onChange={setMode} />

      {mode === 'images' ? (
        <ImageConvertTool />
      ) : (
        <Suspense fallback={<ModeLoadingState />}>
          <DocumentConvertTool />
        </Suspense>
      )}
    </div>
  );
}
