import { ToolPageLayout } from '../components/PageShell';
import { DbVerifyTool } from '../features/db-verify/components/DbVerifyTool';

export function DbVerifyToolPage() {
  return (
    <ToolPageLayout
      title="Verificacao de banco de dados"
      description="Teste host, banco, usuario e senha com um diagnostico rigoroso de conexao MySQL. As credenciais sao usadas apenas no teste e nao ficam salvas."
    >
      <DbVerifyTool />
    </ToolPageLayout>
  );
}
