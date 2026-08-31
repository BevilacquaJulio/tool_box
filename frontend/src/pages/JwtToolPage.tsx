import { ToolPageLayout } from '../components/PageShell';
import { JwtTool } from '../features/jwt/components/JwtTool';

export function JwtToolPage() {
  return (
    <ToolPageLayout
      title="Gerar JWT aleatório"
      description="Escolha o algoritmo HMAC (HS256, HS384 ou HS512) e gere um token com segredo e claims aleatórios. Todo o processamento acontece localmente no navegador."
    >
      <JwtTool />
    </ToolPageLayout>
  );
}
