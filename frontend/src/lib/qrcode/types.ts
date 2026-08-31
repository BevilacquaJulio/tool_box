export type QrContentType = 'text' | 'url' | 'wifi' | 'pix' | 'vcard' | 'email' | 'phone';

export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export type QrGenerateOptions = {
  size: number;
  errorCorrectionLevel: QrErrorCorrectionLevel;
};

export type QrGenerateResult = {
  payload: string;
  pngDataUrl: string;
  svg: string;
};

export type QrTextInput = { contentType: 'text'; text: string };
export type QrUrlInput = { contentType: 'url'; url: string };
export type QrWifiInput = {
  contentType: 'wifi';
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
};
export type QrPixInput = {
  contentType: 'pix';
  key: string;
  merchantName: string;
  merchantCity: string;
  amount?: string;
  txid?: string;
  description?: string;
};
export type QrVcardInput = {
  contentType: 'vcard';
  fullName: string;
  phone?: string;
  email?: string;
  organization?: string;
};
export type QrEmailInput = {
  contentType: 'email';
  to: string;
  subject?: string;
  body?: string;
};
export type QrPhoneInput = { contentType: 'phone'; phone: string };

export type QrContentInput =
  | QrTextInput
  | QrUrlInput
  | QrWifiInput
  | QrPixInput
  | QrVcardInput
  | QrEmailInput
  | QrPhoneInput;

export class QrCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QrCodeError';
  }
}

export const QR_CONTENT_TYPES: Array<{
  value: QrContentType;
  label: string;
  description: string;
}> = [
  { value: 'text', label: 'Texto', description: 'Texto livre' },
  { value: 'url', label: 'URL', description: 'Link / site' },
  { value: 'wifi', label: 'Wi-Fi', description: 'Rede sem fio' },
  { value: 'pix', label: 'Pix', description: 'Pagamento BR' },
  { value: 'vcard', label: 'Contato', description: 'vCard' },
  { value: 'email', label: 'E-mail', description: 'mailto:' },
  { value: 'phone', label: 'Telefone', description: 'tel:' },
];

export const QR_ERROR_CORRECTION_LEVELS: Array<{
  value: QrErrorCorrectionLevel;
  label: string;
  description: string;
}> = [
  { value: 'L', label: 'Baixo (L)', description: '~7% de recuperação' },
  { value: 'M', label: 'Médio (M)', description: '~15% de recuperação' },
  { value: 'Q', label: 'Quartil (Q)', description: '~25% de recuperação' },
  { value: 'H', label: 'Alto (H)', description: '~30% de recuperação' },
];

export const QR_SIZE_OPTIONS = [256, 384, 512, 768, 1024] as const;
