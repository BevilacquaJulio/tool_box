import { ToolPageLayout } from '../components/PageShell';
import { QrCodeTool } from '../features/qrcode/components/QrCodeTool';

export function QrCodeToolPage() {
  return (
    <ToolPageLayout
      title="QR Code"
      description="Crie QR Codes para URLs, textos, Wi-Fi, Pix, contatos, e-mails e telefones. Personalize o tamanho e a correção de erros e exporte em PNG ou SVG."
    >
      <QrCodeTool />
    </ToolPageLayout>
  );
}
