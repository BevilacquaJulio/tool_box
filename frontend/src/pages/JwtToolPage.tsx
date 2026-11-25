import { ToolPageLayout } from '../components/PageShell';
import { JwtTool } from '../features/jwt/components/JwtTool';

export function JwtToolPage() {
  return (
    <ToolPageLayout
      title="Gerador de JWT"
      description="Emita tokens JWT assinados via HMAC (HS256, HS384 ou HS512) com segredo criptográfico aleatório sob medida."
    >
      <JwtTool />
    </ToolPageLayout>
  );
}
