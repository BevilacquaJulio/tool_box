import QRCode from 'qrcode';
import { buildQrPayload } from './payloads';
import type { QrContentInput, QrGenerateOptions, QrGenerateResult } from './types';

export async function generateQrCode(
  input: QrContentInput,
  options: QrGenerateOptions,
): Promise<QrGenerateResult> {
  const payload = buildQrPayload(input);

  const qrOptions = {
    errorCorrectionLevel: options.errorCorrectionLevel,
    width: options.size,
    margin: 2,
    color: {
      dark: '#09090b',
      light: '#ffffff',
    },
  };

  const [pngDataUrl, svg] = await Promise.all([
    QRCode.toDataURL(payload, qrOptions),
    QRCode.toString(payload, { ...qrOptions, type: 'svg' }),
  ]);

  return { payload, pngDataUrl, svg };
}
