import { ToolPageLayout } from '../components/PageShell';
import { DbVerifyTool } from '../features/db-verify/components/DbVerifyTool';

export function DbVerifyToolPage() {
  return (
    <ToolPageLayout
      title="Verificação de banco de dados"
      description="Valide conectividade TCP, negociação TLS, autenticação, schema e permissões de instâncias MySQL e MariaDB."
    >
      <DbVerifyTool />
    </ToolPageLayout>
  );
}
