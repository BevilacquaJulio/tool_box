import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { generateHash, phpassPortableHash } from './generate';
import { identifyHash } from './identify';

const hex = (algorithm: string, input: string | Buffer) =>
  createHash(algorithm).update(input).digest('hex');

describe('generateHash formatos adicionais', () => {
  it.each(['sha224', 'sha384'])('gera %s igual ao node:crypto', async (algorithm) => {
    const reference = hex(algorithm, 'outra');
    const result = await generateHash('hello', reference);
    expect(result.hash).toBe(hex(algorithm, 'hello'));
  });

  it('gera MySQL 4.1+ como * + SHA1(SHA1(senha))', async () => {
    const result = await generateHash('password', `*${'0'.repeat(40)}`);
    const expected = hex('sha1', createHash('sha1').update('password').digest()).toUpperCase();
    expect(result.hash).toBe(`*${expected}`);
  });

  it('phpass portable bate com o vetor oficial do test.php do phpass', () => {
    // $P$9IQRaTwmfeRo7ud9Fh4E2PdI0S3r.L0 = "test12345" (custo "9" = 2^11, salt IQRaTwmf).
    expect(phpassPortableHash('test12345', 'IQRaTwmf', 11)).toBe('eRo7ud9Fh4E2PdI0S3r.L0');
  });

  it('gera phpBB3 $H$ no formato portable que o próprio identificador reconhece', async () => {
    const result = await generateHash('senha', `$H$7${'a'.repeat(30)}`);
    expect(result.hash).toMatch(/^\$H\$7[./0-9A-Za-z]{30}$/);
    expect(identifyHash(result.hash).params.variant).toBe('H');
  });
});

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
