import { ToolPageLayout } from '../components/PageShell';
import { TextDiffTool } from '../features/text-diff/components/TextDiffTool';

export function TextDiffToolPage() {
  return (
    <ToolPageLayout
      title="Comparador de textos"
      description="Compare arquivos e trechos de código lado a lado com destaque por caractere, filtros de normalização e exportação HTML ou patch."
    >
      <TextDiffTool />
    </ToolPageLayout>
  );
}
