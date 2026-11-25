import { lazy, Suspense, useState } from 'react';
import { ImageConvertTool } from '../../image-convert/components/ImageConvertTool';
import { ConvertModeSelector, type ConvertMode } from './ConvertModeSelector';

const DocumentConvertTool = lazy(async () => {
  const module = await import('../../document-convert/components/DocumentConvertTool');
  return { default: module.DocumentConvertTool };
});

function ModeLoadingState() {
  return (
    <div className="grid grid-cols-1 gap-5 animate-pulse lg:grid-cols-2">
      <div className="studio-panel h-72 p-5" />
      <div className="studio-panel h-72 p-5" />
    </div>
  );
}

export function FileConvertTool() {
  const [mode, setMode] = useState<ConvertMode>('images');

  return (
    <div className="space-y-5">
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
