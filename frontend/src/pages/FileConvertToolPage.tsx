import { ToolPageLayout } from '../components/PageShell';
import { FileConvertTool } from '../features/file-convert/components/FileConvertTool';

export function FileConvertToolPage() {
  return (
    <ToolPageLayout
      title="Conversor de arquivos"
      description="Converta imagens e documentos entre os principais formatos, como PNG, WebP, PDF, Word, XLSX, CSV, JSON e XML. Tudo acontece localmente no navegador."
    >
      <FileConvertTool />
    </ToolPageLayout>
  );
}
