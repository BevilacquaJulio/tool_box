import { ToolPageLayout } from '../components/PageShell';
import { JsonFormatterTool } from '../features/json-formatter/components/JsonFormatterTool';

export function JsonFormatterToolPage() {
  return (
    <ToolPageLayout
      title="JSON Formatter"
      description="Formate, minifique, valide, ordene chaves e converta estruturas entre JSON, YAML, XML e CSV com diagnóstico de linha e coluna."
    >
      <JsonFormatterTool />
    </ToolPageLayout>
  );
}
