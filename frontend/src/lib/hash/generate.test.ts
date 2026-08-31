import { describe, expect, it } from 'vitest';
import { generateHash } from './generate';

describe('generateHash digests', () => {
  it('gera MD5 sem depender de suporte do Web Crypto', async () => {
    const result = await generateHash('hello', '5d41402abc4b2a76b9719d911017c592');

    expect(result.algorithm).toBe('md5');
    expect(result.hash).toBe('5d41402abc4b2a76b9719d911017c592');
  });

  it('mantem SHA-256 compativel com Web Crypto', async () => {
    const result = await generateHash(
      'hello',
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );

    expect(result.algorithm).toBe('sha256');
    expect(result.hash).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });
});
