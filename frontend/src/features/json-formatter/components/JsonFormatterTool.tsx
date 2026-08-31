import { BracketsCurly, CheckCircle, DownloadSimple, File, Trash, WarningCircle } from '@phosphor-icons/react';
import { useRef, useState, type ChangeEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { AnimatedSelect } from '../../../components/AnimatedSelect';
import { Button } from '../../../components/Button';
import { CopyField } from '../../../components/CopyField';
import { Textarea } from '../../../components/Input';
import {
  DATA_FORMATS,
  FORMAT_MIME_TYPES,
  type DataFormat,
  type JsonFormatterAction,
} from '../../../lib/json-formatter';
import { formatFileSize } from '../../../lib/image-convert';
import { TOOL_GRID_CLASS } from '../../../layout/content';
import { useJsonFormatterMutation } from '../hooks/useJsonFormatterMutation';

type InputFormat = DataFormat | 'auto';

type FormValues = {
  text: string;
  inputFormat: InputFormat;
  outputFormat: DataFormat;
};

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

function ResultsEmptyState() {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center sm:min-h-[16rem] dark:border-zinc-700">
      <BracketsCurly size={32} aria-hidden="true" className="text-zinc-400 dark:text-zinc-500" />
      <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Nenhum resultado ainda</p>
      <p className="mt-1 max-w-[34ch] text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Cole um JSON ou importe um arquivo e escolha uma ação para ver o resultado aqui.
      </p>
    </div>
  );
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

  async function runAction(action: JsonFormatterAction, values: FormValues, convertFormat?: DataFormat) {
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

  function clearFile() {
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className={TOOL_GRID_CLASS}>
      <section className="space-y-6">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
          Entrada
        </h2>

        <form className="space-y-5 sm:space-y-6">
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Conteúdo</span>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="json-formatter-file-input"
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  <File size={14} aria-hidden="true" />
                  Importar arquivo
                </label>
                {fileName && (
                  <button
                    type="button"
                    onClick={clearFile}
                    className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    <Trash size={14} aria-hidden="true" />
                    Remover
                  </button>
                )}
              </div>
            </div>

            {fileName && (
              <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{fileName}</p>
            )}

            <Textarea
              label="Texto ou JSON"
              hint="JSON, YAML, XML ou CSV. Todo processamento é local."
              placeholder={'{\n  "exemplo": true\n}'}
              spellCheck={false}
              className="min-h-56"
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
          </div>

          <Controller
            name="inputFormat"
            control={control}
            render={({ field }) => (
              <AnimatedSelect
                label="Formato de entrada"
                hint="Use detecção automática ou escolha manualmente."
                options={INPUT_FORMAT_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          <div className="space-y-2">
            <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ações</span>
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

          <div className="space-y-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
            <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Converter para</span>
            <Controller
              name="outputFormat"
              control={control}
              render={({ field }) => (
                <AnimatedSelect
                  label="Formato de saída"
                  hint="CSV exige objeto ou array de objetos tabulares."
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
              fullWidth
              loading={formatterMutation.isPending && activeAction === 'convert'}
              disabled={!text.trim()}
              onClick={handleSubmit((values) => runAction('convert', values, values.outputFormat))}
            >
              Converter para {outputFormat.toUpperCase()}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4 lg:sticky lg:top-[calc(var(--header-height-compact)+1.5rem)] lg:self-start">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
          Resultado
        </h2>

        {!hasResults && <ResultsEmptyState />}

        {result && !result.ok && (
          <div
            role="alert"
            className="space-y-2 rounded-md border border-zinc-400 bg-zinc-100 px-3 py-2.5 text-sm leading-relaxed text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <div className="flex items-start gap-2">
              <WarningCircle size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Erro de sintaxe</p>
                <p className="mt-1">{result.error}</p>
                {result.line !== undefined && result.column !== undefined && (
                  <p className="mt-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    Linha {result.line}, coluna {result.column}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {result?.ok && (
          <div className="space-y-4">
            {result.message && (
              <div className="flex items-start gap-2 rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
                <CheckCircle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-zinc-700 dark:text-zinc-300" />
                <p>{result.message}</p>
              </div>
            )}

            {result.action !== 'validate' && (
              <>
                <CopyField
                  label={`Saída (${result.outputFormat.toUpperCase()})`}
                  value={result.output}
                />

                <button
                  type="button"
                  onClick={() => {
                    const extension =
                      DATA_FORMATS.find((format) => format.value === result.outputFormat)?.extension ??
                      result.outputFormat;
                    downloadText(
                      result.output,
                      `formatado.${extension}`,
                      FORMAT_MIME_TYPES[result.outputFormat],
                    );
                  }}
                  className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-950 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 ease-out hover:bg-zinc-800 active:scale-[0.97] dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  <DownloadSimple size={16} aria-hidden="true" />
                  Baixar arquivo
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
