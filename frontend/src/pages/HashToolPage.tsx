import { ToolPageLayout } from '../components/PageShell';
import { HashTool } from '../features/hash/components/HashTool';

export function HashToolPage() {
  return (
    <ToolPageLayout
      title="Hash de senha"
      description="Inspecione algoritmos e parâmetros de custo (bcrypt, Argon2, scrypt, PBKDF2, phpass, SHA) e gere novos hashes compatíveis."
    >
      <HashTool />
    </ToolPageLayout>
  );
}
