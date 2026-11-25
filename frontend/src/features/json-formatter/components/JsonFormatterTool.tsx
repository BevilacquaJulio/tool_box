import {
  BracketsCurly,
  DownloadSimple,
  Eraser,
  File,
  Sparkle,
  Trash,
} from '@phosphor-icons/react';
import { useRef, useState, type ChangeEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { AnimatedSelect } from '../../../components/AnimatedSelect';
import { Button } from '../../../components/Button';
import { CopyField } from '../../../components/CopyField';
import { Textarea } from '../../../components/Input';
import { StudioAlert, StudioEmptyState, StudioPanel } from '../../../components/PageShell';
import { TOOL_GRID_CLASS } from '../../../layout/content';
import { formatFileSize } from '../../../lib/image-convert';
import {
  DATA_FORMATS,
  FORMAT_MIME_TYPES,
  type DataFormat,
  type JsonFormatterAction,
} from '../../../lib/json-formatter';
import { useJsonFormatterMutation } from '../hooks/useJsonFormatterMutation';

type InputFormat = DataFormat | 'auto';

type FormValues = {
  text: string;
  inputFormat: InputFormat;
  outputFormat: DataFormat;
};

const SAMPLE_JSON = JSON.stringify(
  {
    service: 'toolbox-api',
    environment: 'production',
    port: 3000,
    features: ['db-verify', 'healthcheck'],
    limits: { connectTimeoutMs: 5000, queryTimeoutMs: 8000 },
  },
  null,
  2,
);

const INPUT_FORMAT_OPTIONS = [
  { value: 'auto', label: 'Detectar automaticamente' },
  ...DATA_FORMATS.map((format) => ({ value: format.value, label: format.label })),
];

const ACTION_BUTTONS: Array<{ action: JsonFormatterAction; label: string }> = [
  { action: 'format', label: 'Formatar' },
  { action: 'minify', label: 'Minificar' },
  { action: 'validate', label: 'Validar' },
  { action: 'sort', label: 'Ordenar chaves' },
];

function downloadText(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function JsonFormatterTool() {
  const formatterMutation = useJsonFormatterMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<JsonFormatterAction | null>(null);

  const { control, register, handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      text: '',
      inputFormat: 'auto',
      outputFormat: 'yaml',
    },
  });

  const text = watch('text');
  const outputFormat = watch('outputFormat');
  const result = formatterMutation.data;
  const hasResults = Boolean(result);

  const lineCount = text ? text.split(/\r\n|\r|\n/).length : 0;

  async function runAction(
    action: JsonFormatterAction,
    values: FormValues,
    convertFormat?: DataFormat,
  ) {
    setActiveAction(action);
    formatterMutation.reset();

    await formatterMutation.mutateAsync({
      text: values.text,
      inputFormat: values.inputFormat,
      action,
      outputFormat: convertFormat,
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setValue('text', String(reader.result ?? ''), { shouldDirty: true });
      setFileName(`${file.name} (${formatFileSize(file.size)})`);
      formatterMutation.reset();
    };
    reader.readAsText(file);
  }

  function clearAll() {
    setFileName(null);
    setValue('text', '');
    formatterMutation.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function loadSample() {
    setFileName(null);
    setValue('text', SAMPLE_JSON, { shouldDirty: true });
    setValue('inputFormat', 'json');
    formatterMutation.reset();
  }

  return (
    <div className={TOOL_GRID_CLASS}>
      <StudioPanel
        title="Entrada"
        badge={
          text ? (
            <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]">
              {lineCount} {lineCount === 1 ? 'linha' : 'linhas'}
            </span>
          ) : undefined
        }
        actions={
          <>
            <Button type="button" variant="ghost" size="sm" onClick={loadSample}>
              <Sparkle size={13} aria-hidden="true" />
              Exemplo
            </Button>
            <label
              htmlFor="json-formatter-file-input"
              className="focus-ring inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent-border)] hover:bg-[var(--bg-subtle)]"
            >
              <File size={14} aria-hidden="true" />
              Importar
            </label>
            {(text || fileName) && (
              <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                <Eraser size={13} aria-hidden="true" />
                Limpar
              </Button>
            )}
          </>
        }
      >
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          {fileName && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs">
              <span className="truncate font-mono text-[var(--ink-secondary)]">{fileName}</span>
              <button
                type="button"
                onClick={() => {
                  setFileName(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                aria-label="Desvincular arquivo importado"
                className="inline-flex cursor-pointer items-center gap-1 text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                <Trash size={13} aria-hidden="true" />
              </button>
            </div>
          )}

          <Textarea
            label="Dados estruturados"
            hint="Aceita JSON, YAML, XML ou CSV com detecção automática de formato."
            placeholder={'{\n  "chave": "valor"\n}'}
            spellCheck={false}
            className="min-h-60"
            {...register('text')}
          />

          <input
            id="json-formatter-file-input"
            ref={fileInputRef}
            type="file"
            accept=".json,.yaml,.yml,.xml,.csv,application/json,text/yaml,application/xml,text/csv"
            onChange={handleFileChange}
            className="sr-only"
          />

          <Controller
            name="inputFormat"
            control={control}
            render={({ field }) => (
              <AnimatedSelect
                label="Formato de entrada"
                options={INPUT_FORMAT_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          <div className="space-y-2">
            <span className="block text-xs font-medium text-[var(--ink-secondary)]">
              Operações rápidas
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ACTION_BUTTONS.map((item) => (
                <Button
                  key={item.action}
                  type="button"
                  variant={activeAction === item.action ? 'primary' : 'ghost'}
                  loading={formatterMutation.isPending && activeAction === item.action}
                  onClick={handleSubmit((values) => runAction(item.action, values))}
                  disabled={!text.trim()}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5">
            <Controller
              name="outputFormat"
              control={control}
              render={({ field }) => (
                <AnimatedSelect
                  label="Converter para outro formato"
                  hint="CSV requer objeto plano ou lista de objetos tabulares."
                  options={DATA_FORMATS.map((format) => ({
                    value: format.value,
                    label: format.label,
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            <Button
              type="button"
              variant="secondary"
              fullWidth
              loading={formatterMutation.isPending && activeAction === 'convert'}
              disabled={!text.trim()}
              onClick={handleSubmit((values) => runAction('convert', values, values.outputFormat))}
            >
              Converter para {outputFormat.toUpperCase()}
            </Button>
          </div>
        </form>
      </StudioPanel>

      <div className="lg:sticky lg:top-[calc(var(--topbar-height)+1.25rem)] lg:self-start">
        <StudioPanel
          title="Resultado"
          badge={
            result?.ok ? (
              <span className="rounded border border-[var(--accent-border)] bg-[var(--accent-soft)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--ink)]">
                {result.outputFormat}
              </span>
            ) : undefined
          }
        >
          <div className="space-y-4">
            {!hasResults && (
              <StudioEmptyState
                icon={BracketsCurly}
                title="Sem saída ainda"
                description="Cole ou importe JSON, YAML, XML ou CSV e execute uma operação para inspecionar o resultado."
              />
            )}

            {result && !result.ok && (
              <StudioAlert variant="error" title="Erro de sintaxe">
                <p>{result.error}</p>
                {result.line !== undefined && result.column !== undefined && (
                  <p className="mt-2 inline-block rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-mono text-[11px]">
                    Linha {result.line}, coluna {result.column}
                  </p>
                )}
              </StudioAlert>
            )}

            {result?.ok && (
              <div className="space-y-4">
                {result.message && <StudioAlert variant="success">{result.message}</StudioAlert>}

                {result.action !== 'validate' && (
                  <>
                    <CopyField
                      label={`Saída (${result.outputFormat.toUpperCase()})`}
                      value={result.output}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      fullWidth
                      onClick={() => {
                        const extension =
                          DATA_FORMATS.find((format) => format.value === result.outputFormat)
                            ?.extension ?? result.outputFormat;
                        downloadText(
                          result.output,
                          `formatado.${extension}`,
                          FORMAT_MIME_TYPES[result.outputFormat],
                        );
                      }}
                    >
                      <DownloadSimple size={16} aria-hidden="true" />
                      Baixar arquivo .{result.outputFormat}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </StudioPanel>
      </div>
    </div>
  );
}
