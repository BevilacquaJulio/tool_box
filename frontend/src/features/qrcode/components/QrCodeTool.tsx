import { zodResolver } from '@hookform/resolvers/zod';
import { DownloadSimple, QrCode } from '@phosphor-icons/react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { AnimatedSelect } from '../../../components/AnimatedSelect';
import { Button } from '../../../components/Button';
import { CopyField } from '../../../components/CopyField';
import { Input, Textarea } from '../../../components/Input';
import { StudioAlert, StudioEmptyState, StudioPanel } from '../../../components/PageShell';
import { PasswordInput } from '../../../components/PasswordInput';
import { TOOL_GRID_CLASS } from '../../../layout/content';
import { getErrorMessage } from '../../../lib/errors';
import {
  QR_CONTENT_TYPES,
  QR_ERROR_CORRECTION_LEVELS,
  QR_SIZE_OPTIONS,
  type QrContentInput,
  type QrContentType,
} from '../../../lib/qrcode';
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
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Informe o texto',
            path: ['text'],
          });
        }
        break;
      case 'url':
        if (!values.url.trim()) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Informe a URL',
            path: ['url'],
          });
        }
        break;
      case 'wifi':
        if (!values.ssid.trim()) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Informe o SSID',
            path: ['ssid'],
          });
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
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Informe a chave Pix',
            path: ['pixKey'],
          });
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
  const selectedSize = watch('size');
  const selectedEcc = watch('errorCorrectionLevel');
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
      <StudioPanel title="Configuração do código">
        <form className="space-y-5" onSubmit={handleSubmit(onGenerate)}>
          <div className="space-y-2">
            <span className="block text-xs font-medium text-[var(--ink-secondary)]">
              Tipo de conteúdo
            </span>
            <Controller
              name="contentType"
              control={control}
              render={({ field }) => (
                <div
                  role="tablist"
                  aria-label="Tipo de conteúdo do QR Code"
                  className="grid grid-cols-2 gap-2 sm:grid-cols-4"
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
                        className={`focus-ring cursor-pointer rounded-xl border px-3 py-2 text-left transition-colors duration-150 ${
                          isActive
                            ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--ink)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink)]'
                        }`}
                      >
                        <span className="block text-xs font-semibold">{type.label}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--ink-muted)]">
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
              hint="Qualquer conteúdo textual será codificado diretamente no QR Code."
              placeholder="Digite ou cole o texto..."
              mono={false}
              error={errors.text?.message}
              {...register('text')}
            />
          )}

          {contentType === 'url' && (
            <Input
              label="URL de destino"
              hint="Links web, deep links ou endereços internos."
              placeholder="https://exemplo.com"
              error={errors.url?.message}
              spellCheck={false}
              {...register('url')}
            />
          )}

          {contentType === 'wifi' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Nome da rede (SSID)"
                  error={errors.ssid?.message}
                  {...register('ssid')}
                />
                <Controller
                  name="wifiEncryption"
                  control={control}
                  render={({ field }) => (
                    <AnimatedSelect
                      label="Autenticação"
                      options={[
                        { value: 'WPA', label: 'WPA / WPA2 / WPA3' },
                        { value: 'WEP', label: 'WEP' },
                        { value: 'nopass', label: 'Aberta (sem senha)' },
                      ]}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </div>

              <PasswordInput
                label="Senha da rede"
                error={errors.wifiPassword?.message}
                {...register('wifiPassword')}
              />

              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-xs font-medium text-[var(--ink-secondary)]">
                <input
                  type="checkbox"
                  className="size-4 rounded"
                  {...register('wifiHidden')}
                />
                SSID oculto (rede invisível)
              </label>
            </div>
          )}

          {contentType === 'pix' && (
            <div className="space-y-4">
              <Input
                label="Chave Pix"
                hint="CPF, CNPJ, e-mail, telefone (+55...) ou chave aleatória EVP."
                placeholder="chave@exemplo.com.br"
                error={errors.pixKey?.message}
                spellCheck={false}
                {...register('pixKey')}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Nome do recebedor"
                  mono={false}
                  error={errors.pixMerchantName?.message}
                  {...register('pixMerchantName')}
                />
                <Input
                  label="Cidade"
                  mono={false}
                  error={errors.pixMerchantCity?.message}
                  {...register('pixMerchantCity')}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Valor em R$ (opcional)"
                  hint="Vazio = valor livre no app do pagador."
                  placeholder="0,00"
                  {...register('pixAmount')}
                />
                <Input
                  label="TXID (opcional)"
                  hint="Até 25 caracteres. Padrão: ***"
                  placeholder="***"
                  {...register('pixTxid')}
                />
              </div>
            </div>
          )}

          {contentType === 'vcard' && (
            <div className="space-y-4">
              <Input
                label="Nome completo"
                mono={false}
                error={errors.vcardName?.message}
                {...register('vcardName')}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Telefone (opcional)"
                  placeholder="+5511999999999"
                  {...register('vcardPhone')}
                />
                <Input
                  label="E-mail (opcional)"
                  type="email"
                  spellCheck={false}
                  {...register('vcardEmail')}
                />
              </div>
              <Input
                label="Organização / Empresa (opcional)"
                mono={false}
                {...register('vcardOrganization')}
              />
            </div>
          )}

          {contentType === 'email' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Destinatário"
                  type="email"
                  error={errors.emailTo?.message}
                  spellCheck={false}
                  {...register('emailTo')}
                />
                <Input
                  label="Assunto (opcional)"
                  mono={false}
                  {...register('emailSubject')}
                />
              </div>
              <Textarea
                label="Corpo da mensagem (opcional)"
                mono={false}
                {...register('emailBody')}
              />
            </div>
          )}

          {contentType === 'phone' && (
            <Input
              label="Telefone com DDI"
              hint="Exemplo: +5511999999999"
              placeholder="+5511999999999"
              error={errors.phone?.message}
              {...register('phone')}
            />
          )}

          <div className="grid grid-cols-1 gap-4 border-t border-[var(--border-subtle)] pt-5 sm:grid-cols-2">
            <Controller
              name="size"
              control={control}
              render={({ field }) => (
                <AnimatedSelect
                  label="Resolução PNG"
                  options={QR_SIZE_OPTIONS.map((size) => ({
                    value: String(size),
                    label: `${size} × ${size} px`,
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
                  label="Correção de erro (ECC)"
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
      </StudioPanel>

      <div className="lg:sticky lg:top-[calc(var(--topbar-height)+1.25rem)] lg:self-start">
        <StudioPanel
          title="Pré-visualização e exportação"
          badge={
            result ? (
              <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]">
                {selectedSize}px · ECC {selectedEcc}
              </span>
            ) : undefined
          }
        >
          <div className="space-y-4">
            {!hasResults && (
              <StudioEmptyState
                icon={QrCode}
                title="Sem QR Code gerado"
                description="Preencha os dados ao lado e clique em gerar para pré-visualizar e baixar em PNG ou SVG."
              />
            )}

            {activeError && <StudioAlert variant="error">{activeError}</StudioAlert>}

            {result && (
              <div className="space-y-4">
                <div className="flex justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-5">
                  <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
                    <img
                      src={result.pngDataUrl}
                      alt="QR Code gerado"
                      className="max-h-60 max-w-full object-contain"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => downloadDataUrl(result.pngDataUrl, 'qrcode.png')}
                  >
                    <DownloadSimple size={16} aria-hidden="true" />
                    Baixar PNG
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => downloadText(result.svg, 'qrcode.svg', 'image/svg+xml')}
                  >
                    <DownloadSimple size={16} aria-hidden="true" />
                    Baixar SVG
                  </Button>
                </div>

                <CopyField label="Payload codificado" value={result.payload} />
              </div>
            )}
          </div>
        </StudioPanel>
      </div>
    </div>
  );
}
