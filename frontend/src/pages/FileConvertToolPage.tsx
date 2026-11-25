import { ToolPageLayout } from '../components/PageShell';
import { FileConvertTool } from '../features/file-convert/components/FileConvertTool';

export function FileConvertToolPage() {
  return (
    <ToolPageLayout
      title="Conversor de arquivos"
      description="Converta imagens (incluindo HEIC e RAW) e documentos (PDF, Word, XLSX, CSV, Markdown, HTML, JSON e XML) localmente, em arquivo único ou lote ZIP."
    >
      <FileConvertTool />
    </ToolPageLayout>
  );
}
