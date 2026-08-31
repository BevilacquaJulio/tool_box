import { zodResolver } from '@hookform/resolvers/zod';
import { DownloadSimple, QrCode } from '@phosphor-icons/react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { AnimatedSelect } from '../../../components/AnimatedSelect';
import { Button } from '../../../components/Button';
import { CopyField } from '../../../components/CopyField';
import { Input, Textarea } from '../../../components/Input';
import { getErrorMessage } from '../../../lib/errors';
import {
  QR_CONTENT_TYPES,
  QR_ERROR_CORRECTION_LEVELS,
  QR_SIZE_OPTIONS,
  type QrContentInput,
  type QrContentType,
} from '../../../lib/qrcode';
import { TOOL_GRID_CLASS } from '../../../layout/content';
import { useGenerateQrCodeMutation } from '../hooks/useQrCodeMutation';

const contentTypeValues = QR_CONTENT_TYPES.map((item) => item.value) as [
  QrContentType,
  ...QrContentType[],
];

const errorLevelValues = QR_ERROR_CORRECTION_LEVELS.map((item) => item.value) as [
  'L' | 'M' | 'Q' | 'H',
  ...Array<'L' | 'M' | 'Q' | 'H'>,
];

const formSchema = z
  .object({
    contentType: z.enum(contentTypeValues),
    text: z.string(),
    url: z.string(),
    ssid: z.string(),
    wifiPassword: z.string(),
    wifiEncryption: z.enum(['WPA', 'WEP', 'nopass']),
    wifiHidden: z.boolean(),
    pixKey: z.string(),
    pixMerchantName: z.string(),
    pixMerchantCity: z.string(),
    pixAmount: z.string(),
    pixTxid: z.string(),
    vcardName: z.string(),
    vcardPhone: z.string(),
    vcardEmail: z.string(),
    vcardOrganization: z.string(),
    emailTo: z.string(),
    emailSubject: z.string(),
    emailBody: z.string(),
    phone: z.string(),
    size: z.coerce.number(),
    errorCorrectionLevel: z.enum(errorLevelValues),
  })
  .superRefine((values, context) => {
    switch (values.contentType) {
      case 'text':
        if (!values.text.trim()) {
          context.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o texto', path: ['text'] });
        }
        break;
      case 'url':
        if (!values.url.trim()) {
          context.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe a URL', path: ['url'] });
        }
        break;
      case 'wifi':
        if (!values.ssid.trim()) {
          context.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o SSID', path: ['ssid'] });
        }
        if (values.wifiEncryption !== 'nopass' && !values.wifiPassword.trim()) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Informe a senha da rede',
            path: ['wifiPassword'],
          });
        }
        break;
      case 'pix':
        if (!values.pixKey.trim()) {
          context.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe a chave Pix', path: ['pixKey'] });
        }
        if (!values.pixMerchantName.trim()) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Informe o nome do recebedor',
            path: ['pixMerchantName'],
          });
        }
        if (!values.pixMerchantCity.trim()) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Informe a cidade',
            path: ['pixMerchantCity'],
          });
        }
        break;
      case 'vcard':
        if (!values.vcardName.trim()) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Informe o nome do contato',
            path: ['vcardName'],
          });
        }
        break;
      case 'email':
        if (!values.emailTo.trim()) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Informe o e-mail',
            path: ['emailTo'],
          });
        }
        break;
      case 'phone':
        if (!values.phone.trim()) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Informe o telefone',
            path: ['phone'],
          });
        }
        break;
      default:
        break;
    }
  });

type FormValues = z.infer<typeof formSchema>;

function buildInput(values: FormValues): QrContentInput {
  switch (values.contentType) {
    case 'text':
      return { contentType: 'text', text: values.text };
    case 'url':
      return { contentType: 'url', url: values.url };
    case 'wifi':
      return {
        contentType: 'wifi',
        ssid: values.ssid,
        password: values.wifiPassword,
        encryption: values.wifiEncryption,
        hidden: values.wifiHidden,
      };
    case 'pix':
      return {
        contentType: 'pix',
        key: values.pixKey,
        merchantName: values.pixMerchantName,
        merchantCity: values.pixMerchantCity,
        amount: values.pixAmount || undefined,
        txid: values.pixTxid || undefined,
      };
    case 'vcard':
      return {
        contentType: 'vcard',
        fullName: values.vcardName,
        phone: values.vcardPhone || undefined,
        email: values.vcardEmail || undefined,
        organization: values.vcardOrganization || undefined,
      };
    case 'email':
      return {
        contentType: 'email',
        to: values.emailTo,
        subject: values.emailSubject || undefined,
        body: values.emailBody || undefined,
      };
    case 'phone':
      return { contentType: 'phone', phone: values.phone };
    default:
      return { contentType: 'text', text: values.text };
  }
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

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
      <QrCode size={32} aria-hidden="true" className="text-zinc-400 dark:text-zinc-500" />
      <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Nenhum QR Code ainda</p>
      <p className="mt-1 max-w-[32ch] text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Preencha o conteúdo e clique em gerar para visualizar e exportar.
      </p>
    </div>
  );
}

export function QrCodeTool() {
  const generateMutation = useGenerateQrCodeMutation();

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contentType: 'url',
      text: '',
      url: '',
      ssid: '',
      wifiPassword: '',
      wifiEncryption: 'WPA',
      wifiHidden: false,
      pixKey: '',
      pixMerchantName: '',
      pixMerchantCity: '',
      pixAmount: '',
      pixTxid: '',
      vcardName: '',
      vcardPhone: '',
      vcardEmail: '',
      vcardOrganization: '',
      emailTo: '',
      emailSubject: '',
      emailBody: '',
      phone: '',
      size: 512,
      errorCorrectionLevel: 'M',
    },
  });

  const contentType = watch('contentType');
  const result = generateMutation.data;
  const activeError = generateMutation.error ? getErrorMessage(generateMutation.error) : null;
  const hasResults = Boolean(result || activeError);

  async function onGenerate(values: FormValues) {
    generateMutation.reset();
    await generateMutation.mutateAsync({
      input: buildInput(values),
      options: {
        size: values.size,
        errorCorrectionLevel: values.errorCorrectionLevel,
      },
    });
  }

  return (
    <div className={TOOL_GRID_CLASS}>
      <section className="space-y-6">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
          Entrada
        </h2>

        <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit(onGenerate)}>
          <div className="space-y-2">
            <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Tipo de conteúdo
            </span>
            <Controller
              name="contentType"
              control={control}
              render={({ field }) => (
                <div
                  role="tablist"
                  aria-label="Tipo de conteúdo do QR Code"
                  className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
                >
                  {QR_CONTENT_TYPES.map((type) => {
                    const isActive = field.value === type.value;

                    return (
                      <button
                        key={type.value}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => {
                          field.onChange(type.value);
                          generateMutation.reset();
                        }}
                        className={`min-h-11 cursor-pointer rounded-md border px-3 py-2.5 text-left transition-colors ${
                          isActive
                            ? 'border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                            : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/80'
                        }`}
                      >
                        <span className="block text-sm font-medium">{type.label}</span>
                        <span
                          className={`mt-0.5 block text-[11px] ${
                            isActive
                              ? 'text-zinc-200 dark:text-zinc-600'
                              : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {type.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          {contentType === 'text' && (
            <Textarea
              label="Texto"
              hint="Qualquer conteúdo textual será codificado no QR Code."
              placeholder="Digite ou cole o texto..."
              error={errors.text?.message}
              {...register('text')}
            />
          )}

          {contentType === 'url' && (
            <Input
              label="URL"
              hint="Sites, links profundos ou páginas web."
              placeholder="https://exemplo.com"
              error={errors.url?.message}
              spellCheck={false}
              {...register('url')}
            />
          )}

          {contentType === 'wifi' && (
            <>
              <Input label="Nome da rede (SSID)" error={errors.ssid?.message} {...register('ssid')} />
              <Input
                label="Senha"
                type="password"
                autoComplete="off"
                error={errors.wifiPassword?.message}
                {...register('wifiPassword')}
              />
              <Controller
                name="wifiEncryption"
                control={control}
                render={({ field }) => (
                  <AnimatedSelect
                    label="Criptografia"
                    options={[
                      { value: 'WPA', label: 'WPA / WPA2' },
                      { value: 'WEP', label: 'WEP' },
                      { value: 'nopass', label: 'Sem senha' },
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  className="size-4 rounded border-zinc-300 dark:border-zinc-700"
                  {...register('wifiHidden')}
                />
                Rede oculta
              </label>
            </>
          )}

          {contentType === 'pix' && (
            <>
              <Input
                label="Chave Pix"
                hint="CPF, CNPJ, e-mail, telefone ou chave aleatória."
                placeholder="email@exemplo.com"
                error={errors.pixKey?.message}
                spellCheck={false}
                {...register('pixKey')}
              />
              <Input
                label="Nome do recebedor"
                error={errors.pixMerchantName?.message}
                {...register('pixMerchantName')}
              />
              <Input
                label="Cidade"
                error={errors.pixMerchantCity?.message}
                {...register('pixMerchantCity')}
              />
              <Input
                label="Valor (opcional)"
                hint="Ex.: 10,00. Deixe vazio para um QR estático sem valor fixo."
                placeholder="0,00"
                {...register('pixAmount')}
              />
              <Input
                label="Identificador da transação (opcional)"
                hint="TXID: até 25 caracteres. Padrão: ***"
                {...register('pixTxid')}
              />
            </>
          )}

          {contentType === 'vcard' && (
            <>
              <Input label="Nome completo" error={errors.vcardName?.message} {...register('vcardName')} />
              <Input label="Telefone (opcional)" placeholder="+5511999999999" {...register('vcardPhone')} />
              <Input
                label="E-mail (opcional)"
                type="email"
                spellCheck={false}
                {...register('vcardEmail')}
              />
              <Input label="Empresa (opcional)" {...register('vcardOrganization')} />
            </>
          )}

          {contentType === 'email' && (
            <>
              <Input
                label="Para"
                type="email"
                error={errors.emailTo?.message}
                spellCheck={false}
                {...register('emailTo')}
              />
              <Input label="Assunto (opcional)" {...register('emailSubject')} />
              <Textarea label="Mensagem (opcional)" {...register('emailBody')} />
            </>
          )}

          {contentType === 'phone' && (
            <Input
              label="Telefone"
              hint="Inclua o código do país, por exemplo: +5511999999999"
              placeholder="+5511999999999"
              error={errors.phone?.message}
              {...register('phone')}
            />
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Controller
              name="size"
              control={control}
              render={({ field }) => (
                <AnimatedSelect
                  label="Tamanho (px)"
                  hint="Largura da imagem PNG exportada."
                  options={QR_SIZE_OPTIONS.map((size) => ({
                    value: String(size),
                    label: `${size} px`,
                  }))}
                  value={String(field.value)}
                  onChange={(value) => field.onChange(Number(value))}
                  onBlur={field.onBlur}
                />
              )}
            />

            <Controller
              name="errorCorrectionLevel"
              control={control}
              render={({ field }) => (
                <AnimatedSelect
                  label="Correção de erro"
                  hint="Níveis mais altos toleram danos parciais ao código."
                  options={QR_ERROR_CORRECTION_LEVELS.map((level) => ({
                    value: level.value,
                    label: `${level.label}: ${level.description}`,
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </div>

          <Button type="submit" fullWidth loading={generateMutation.isPending}>
            <QrCode size={16} aria-hidden="true" />
            Gerar QR Code
          </Button>
        </form>
      </section>

      <section className="space-y-4 lg:sticky lg:top-[calc(var(--header-height-compact)+1.5rem)] lg:self-start">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
          Resultado
        </h2>

        {!hasResults && <ResultsEmptyState />}

        {activeError && (
          <p
            role="alert"
            className="rounded-md border border-zinc-400 bg-zinc-100 px-3 py-2.5 text-sm leading-relaxed text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
          >
            {activeError}
          </p>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex justify-center rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <img
                src={result.pngDataUrl}
                alt="QR Code gerado"
                className="max-w-full"
              />
            </div>

            <CopyField label="Conteúdo codificado" value={result.payload} />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => downloadDataUrl(result.pngDataUrl, 'qrcode.png')}
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-950 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 ease-out hover:bg-zinc-800 active:scale-[0.97] dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                <DownloadSimple size={16} aria-hidden="true" />
                Baixar PNG
              </button>
              <button
                type="button"
                onClick={() => downloadText(result.svg, 'qrcode.svg', 'image/svg+xml')}
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
              >
                <DownloadSimple size={16} aria-hidden="true" />
                Baixar SVG
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
