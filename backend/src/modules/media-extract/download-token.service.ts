import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { EnvConfig } from '../../config/env.validation';
import type { DownloadTokenPayload } from './media-extract.types';

const FALLBACK_KEY_DOMAIN = 'toolbox:media-download-token:v1';

@Injectable()
export class DownloadTokenService {
  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  private get secret(): string {
    const configured = this.configService.get('MEDIA_DOWNLOAD_SECRET', { infer: true });
    if (configured) {
      return configured;
    }

    // Deriva chave separada por domínio a partir de INTERNAL_API_KEY quando MEDIA_DOWNLOAD_SECRET não está definida.
    const internalApiKey = this.configService.get('INTERNAL_API_KEY', { infer: true });
    return createHmac('sha256', internalApiKey).update(FALLBACK_KEY_DOMAIN).digest('hex');
  }

  private get ttlSeconds(): number {
    return this.configService.get('MEDIA_DOWNLOAD_TOKEN_TTL_SECONDS', { infer: true });
  }

  create(payload: Omit<DownloadTokenPayload, 'exp'>): string {
    const fullPayload: DownloadTokenPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + this.ttlSeconds,
    };

    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = createHmac('sha256', this.secret).update(encodedPayload).digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  verify(token: string): DownloadTokenPayload {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new BadRequestException('Token de download inválido.');
    }

    const [encodedPayload, signature] = parts;
    const expectedSignature = createHmac('sha256', this.secret)
      .update(encodedPayload)
      .digest('base64url');

    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new BadRequestException('Assinatura de token inválida.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Payload de token inválido.');
    }

    if (!this.isValidPayload(parsed)) {
      throw new BadRequestException('Payload de token inválido.');
    }

    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      throw new BadRequestException('Token de download expirado.');
    }

    return parsed;
  }

  private isValidPayload(value: unknown): value is DownloadTokenPayload {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
      (candidate.mode === 'direct' || candidate.mode === 'ytdlp') &&
      typeof candidate.url === 'string' &&
      candidate.url.length > 0 &&
      typeof candidate.filename === 'string' &&
      candidate.filename.length > 0 &&
      typeof candidate.exp === 'number' &&
      Number.isFinite(candidate.exp) &&
      (candidate.formatId === undefined || typeof candidate.formatId === 'string')
    );
  }
}
