import type { QrContentInput } from './types';
import { QrCodeError } from './types';

function formatEmvField(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

export function crc16Ccitt(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function escapeWifiValue(value: string): string {
  return value.replace(/([\\;,":])/g, '\\$1');
}

function normalizePixAmount(amount: string): string {
  const normalized = amount.replace(/\./g, '').replace(',', '.').trim();
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new QrCodeError('Informe um valor Pix válido (ex.: 10,00).');
  }

  return parsed.toFixed(2);
}

function buildPixPayload(input: Extract<QrContentInput, { contentType: 'pix' }>): string {
  const key = input.key.trim();
  const merchantName = input.merchantName.trim();
  const merchantCity = input.merchantCity.trim();

  if (!key) {
    throw new QrCodeError('Informe a chave Pix.');
  }

  if (!merchantName) {
    throw new QrCodeError('Informe o nome do recebedor.');
  }

  if (!merchantCity) {
    throw new QrCodeError('Informe a cidade do recebedor.');
  }

  const merchantAccount =
    formatEmvField('00', 'br.gov.bcb.pix') + formatEmvField('01', key);

  let payload = formatEmvField('00', '01');
  payload += formatEmvField('26', merchantAccount);
  payload += formatEmvField('52', '0000');

  if (input.amount?.trim()) {
    payload += formatEmvField('54', normalizePixAmount(input.amount));
  }

  payload += formatEmvField('58', 'BR');
  payload += formatEmvField('59', merchantName.slice(0, 25));
  payload += formatEmvField('60', merchantCity.slice(0, 15));

  const txid = input.txid?.trim() || '***';
  const additionalData = formatEmvField('05', txid.slice(0, 25));
  payload += formatEmvField('62', additionalData);

  payload += '6304';
  payload += crc16Ccitt(payload);

  return payload;
}

function buildVcardPayload(input: Extract<QrContentInput, { contentType: 'vcard' }>): string {
  const fullName = input.fullName.trim();

  if (!fullName) {
    throw new QrCodeError('Informe o nome do contato.');
  }

  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${fullName}`, `N:${fullName};;;;`];

  if (input.phone?.trim()) {
    lines.push(`TEL:${input.phone.trim()}`);
  }

  if (input.email?.trim()) {
    lines.push(`EMAIL:${input.email.trim()}`);
  }

  if (input.organization?.trim()) {
    lines.push(`ORG:${input.organization.trim()}`);
  }

  lines.push('END:VCARD');
  return lines.join('\n');
}

function buildEmailPayload(input: Extract<QrContentInput, { contentType: 'email' }>): string {
  const to = input.to.trim();

  if (!to) {
    throw new QrCodeError('Informe o endereço de e-mail.');
  }

  const params = new URLSearchParams();

  if (input.subject?.trim()) {
    params.set('subject', input.subject.trim());
  }

  if (input.body?.trim()) {
    params.set('body', input.body.trim());
  }

  const query = params.toString();
  return query ? `mailto:${to}?${query}` : `mailto:${to}`;
}

export function buildQrPayload(input: QrContentInput): string {
  switch (input.contentType) {
    case 'text': {
      const text = input.text.trim();
      if (!text) {
        throw new QrCodeError('Informe o texto do QR Code.');
      }
      return text;
    }

    case 'url': {
      const url = input.url.trim();
      if (!url) {
        throw new QrCodeError('Informe a URL.');
      }

      try {
        const parsed = new URL(url.includes('://') ? url : `https://${url}`);
        return parsed.toString();
      } catch {
        throw new QrCodeError('Informe uma URL válida.');
      }
    }

    case 'wifi': {
      const ssid = input.ssid.trim();
      if (!ssid) {
        throw new QrCodeError('Informe o nome da rede Wi-Fi (SSID).');
      }

      if (input.encryption !== 'nopass' && !input.password.trim()) {
        throw new QrCodeError('Informe a senha da rede Wi-Fi.');
      }

      const encryption = input.encryption === 'nopass' ? 'nopass' : input.encryption;
      const password =
        encryption === 'nopass' ? '' : escapeWifiValue(input.password.trim());
      const hidden = input.hidden ? 'true' : 'false';

      return `WIFI:T:${encryption};S:${escapeWifiValue(ssid)};P:${password};H:${hidden};;`;
    }

    case 'pix':
      return buildPixPayload(input);

    case 'vcard':
      return buildVcardPayload(input);

    case 'email':
      return buildEmailPayload(input);

    case 'phone': {
      const phone = input.phone.trim();
      if (!phone) {
        throw new QrCodeError('Informe o número de telefone.');
      }
      return phone.startsWith('tel:') ? phone : `tel:${phone}`;
    }

    default:
      throw new QrCodeError('Tipo de conteúdo não suportado.');
  }
}
