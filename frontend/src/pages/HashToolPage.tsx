import { ToolPageLayout } from '../components/PageShell';
import { HashTool } from '../features/hash/components/HashTool';

export function HashToolPage() {
  return (
    <ToolPageLayout
      title="Identificar e gerar hash de senha"
      description="Identifique o algoritmo de um hash e gere outro no mesmo formato a partir de uma senha. Todo o processamento acontece localmente no navegador."
    >
      <HashTool />
    </ToolPageLayout>
  );
}
