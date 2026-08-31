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
});
