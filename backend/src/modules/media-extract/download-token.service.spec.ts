import { createHmac } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { DownloadTokenService } from './download-token.service';

function makeConfig(values: Partial<Record<keyof EnvConfig, unknown>>): ConfigService<EnvConfig, true> {
  return {
    get: (key: keyof EnvConfig) => values[key],
  } as unknown as ConfigService<EnvConfig, true>;
}

describe('DownloadTokenService', () => {
  const service = new DownloadTokenService(
    makeConfig({
      MEDIA_DOWNLOAD_SECRET: 'super-secret-key-123456',
      MEDIA_DOWNLOAD_TOKEN_TTL_SECONDS: 900,
      INTERNAL_API_KEY: 'internal-api-key-with-at-least-32-chars',
    }),
  );

  it('cria e valida token assinado com sucesso', () => {
    const token = service.create({
      mode: 'direct',
      url: 'https://example.com/video.mp4',
      filename: 'video.mp4',
    });

    const payload = service.verify(token);
    expect(payload.url).toBe('https://example.com/video.mp4');
    expect(payload.mode).toBe('direct');
    expect(payload.filename).toBe('video.mp4');
  });

  it('deriva chave segura a partir de INTERNAL_API_KEY quando MEDIA_DOWNLOAD_SECRET não é definida', () => {
    const fallbackService = new DownloadTokenService(
      makeConfig({
        MEDIA_DOWNLOAD_SECRET: undefined,
        MEDIA_DOWNLOAD_TOKEN_TTL_SECONDS: 600,
        INTERNAL_API_KEY: 'internal-api-key-with-at-least-32-chars',
      }),
    );

    const token = fallbackService.create({
      mode: 'ytdlp',
      url: 'https://youtu.be/dQw4w9WgXcQ',
      filename: 'demo.mp4',
      formatId: '18',
    });

    expect(fallbackService.verify(token)).toMatchObject({
      mode: 'ytdlp',
      formatId: '18',
    });
    expect(() => service.verify(token)).toThrow(/Assinatura/);
  });

  it('rejeita token expirado', () => {
    const encodedPayload = Buffer.from(
      JSON.stringify({
        mode: 'direct',
        url: 'https://example.com/video.mp4',
        filename: 'video.mp4',
        exp: Math.floor(Date.now() / 1000) - 10,
      }),
    ).toString('base64url');

    const signature = createHmac('sha256', 'super-secret-key-123456')
      .update(encodedPayload)
      .digest('base64url');

    expect(() => service.verify(`${encodedPayload}.${signature}`)).toThrow(/expirado/);
  });

  it('rejeita assinatura inválida e formato malformado', () => {
    const token = service.create({
      mode: 'direct',
      url: 'https://example.com/video.mp4',
      filename: 'video.mp4',
    });

    const [payload] = token.split('.');
    expect(() => service.verify(`${payload}.invalid-signature`)).toThrow(/Assinatura/);
    expect(() => service.verify('token-sem-ponto')).toThrow(/inválido/);
  });
});
