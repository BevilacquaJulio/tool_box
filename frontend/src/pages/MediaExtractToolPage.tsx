import { ToolPageLayout } from '../components/PageShell';
import { MediaExtractTool } from '../features/media-extract/components/MediaExtractTool';

export function MediaExtractToolPage() {
  return (
    <ToolPageLayout
      title="Extrator de mídia"
      description="Analise links públicos do YouTube, Instagram, TikTok ou arquivos diretos para inspecionar metadados e baixar via API interna."
    >
      <MediaExtractTool />
    </ToolPageLayout>
  );
}
