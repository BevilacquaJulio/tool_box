import { ToolPageLayout } from '../components/PageShell';
import { JsonFormatterTool } from '../features/json-formatter/components/JsonFormatterTool';

export function JsonFormatterToolPage() {
  return (
    <ToolPageLayout
      title="JSON Formatter"
      description="Formate, minifique, valide e converta dados entre JSON, YAML, XML e CSV. Os erros indicam a linha e a coluna para facilitar a correção."
    >
      <JsonFormatterTool />
    </ToolPageLayout>
  );
}
