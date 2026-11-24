import { describe, expect, it } from 'vitest';
import { jwtVerify } from 'jose';
import { generateRandomJwt } from './random';

function base64UrlByteLength(value: string): number {
  return Math.floor((value.length * 6) / 8);
}

describe('generateRandomJwt', () => {
  it('gera token compacto HS256 sem expiração e expõe o segredo de verificação', async () => {
    const result = await generateRandomJwt({ algorithm: 'HS256' });

    expect(result.token.split('.')).toHaveLength(3);
    expect(result.token.length).toBeLessThan(120);
    expect(result.algorithm).toBe('HS256');
    expect(base64UrlByteLength(result.secret)).toBeGreaterThanOrEqual(32);

    const verified = await jwtVerify(result.token, new TextEncoder().encode(result.secret), {
      algorithms: ['HS256'],
    });

    expect(verified.protectedHeader.alg).toBe('HS256');
    expect(verified.payload.sub).toBeTypeOf('string');
  });

  it.each([
    ['HS256', 32],
    ['HS384', 48],
    ['HS512', 64],
  ] as const)('gera segredo adequado para %s', async (algorithm, minimumBytes) => {
    const result = await generateRandomJwt({ algorithm });

    expect(result.algorithm).toBe(algorithm);
    expect(base64UrlByteLength(result.secret)).toBeGreaterThanOrEqual(minimumBytes);

    await expect(
      jwtVerify(result.token, new TextEncoder().encode(result.secret), {
        algorithms: [algorithm],
      }),
    ).resolves.toBeDefined();
  });

  it.each([32, 100, 512])('gera segredo com exatamente %i caracteres e assina com ele', async (secretLength) => {
    const result = await generateRandomJwt({ algorithm: 'HS256', secretLength });

    expect(result.secret).toHaveLength(secretLength);
    expect(result.secret).toMatch(/^[A-Za-z0-9_-]+$/);
    await expect(
      jwtVerify(result.token, new TextEncoder().encode(result.secret), { algorithms: ['HS256'] }),
    ).resolves.toBeDefined();
  });

  it.each([
    ['HS256', 31],
    ['HS512', 63],
    ['HS256', 513],
    ['HS256', 40.5],
  ] as const)('recusa segredo fora do limite: %s com %s caracteres', async (algorithm, secretLength) => {
    await expect(generateRandomJwt({ algorithm, secretLength })).rejects.toThrow(/entre/);
  });
});
