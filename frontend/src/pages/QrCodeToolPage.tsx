import { ToolPageLayout } from '../components/PageShell';
import { QrCodeTool } from '../features/qrcode/components/QrCodeTool';

export function QrCodeToolPage() {
  return (
    <ToolPageLayout
      title="QR Code"
      description="Codifique URLs, textos, redes Wi-Fi, chaves Pix, cartões vCard, e-mails e telefones para exportação em PNG ou SVG."
    >
      <QrCodeTool />
    </ToolPageLayout>
  );
}
