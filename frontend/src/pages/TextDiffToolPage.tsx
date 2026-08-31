import { ToolPageLayout } from '../components/PageShell';
import { TextDiffTool } from '../features/text-diff/components/TextDiffTool';

export function TextDiffToolPage() {
  return (
    <ToolPageLayout
      title="Diff de textos e códigos"
      description="Compare textos ou arquivos lado a lado e destaque linhas adicionadas, removidas ou alteradas. Inclui realce de sintaxe, opções para ignorar espaços e exportação."
    >
      <TextDiffTool />
    </ToolPageLayout>
  );
}
