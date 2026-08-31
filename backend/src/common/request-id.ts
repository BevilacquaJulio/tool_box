import { randomUUID } from 'node:crypto';

export function resolveRequestId(headerValue: string | string[] | undefined): string {
  if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
    return headerValue.trim().slice(0, 128);
  }
  return randomUUID();
}
