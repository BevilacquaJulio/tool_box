import { ToolPageLayout } from '../components/PageShell';
import { ColorConvertTool } from '../features/color-convert/components/ColorConvertTool';

export function ColorConvertToolPage() {
  return (
    <ToolPageLayout
      title="Conversor de cores"
      description="Converta cores entre HEX, RGB e HSL, crie paletas e gradientes lineares, radiais ou cônicos e exporte o resultado em CSS ou Tailwind."
    >
      <ColorConvertTool />
    </ToolPageLayout>
  );
}
