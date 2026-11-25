import { ToolPageLayout } from '../components/PageShell';
import { ColorConvertTool } from '../features/color-convert/components/ColorConvertTool';

export function ColorConvertToolPage() {
  return (
    <ToolPageLayout
      title="Laboratório de cores"
      description="Converta valores cromáticos, confira contraste WCAG em fundos claro e escuro, gere paletas harmônicas e monte degradês CSS/Tailwind."
    >
      <ColorConvertTool />
    </ToolPageLayout>
  );
}
