import { useMutation } from '@tanstack/react-query';
import type { QrContentInput, QrGenerateOptions, QrGenerateResult } from '../../../lib/qrcode';
import { generateQrCode } from '../../../lib/qrcode';

export function useGenerateQrCodeMutation() {
  return useMutation<
    QrGenerateResult,
    Error,
    { input: QrContentInput; options: QrGenerateOptions }
  >({
    mutationFn: ({ input, options }) => generateQrCode(input, options),
  });
}
