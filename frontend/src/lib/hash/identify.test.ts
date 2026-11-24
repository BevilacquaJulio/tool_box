import { describe, expect, it } from 'vitest';
import { identifyHash } from './identify';

const c = (n: number, ch = 'a') => ch.repeat(n);

describe('identifyHash', () => {
  it('identifica bcrypt PHP $2y$', () => {
    const result = identifyHash(
      '$2y$10$oSsMTp3D4WfjGaUbRsZmYeOkn7yYhtbOK2lM5WAMGnpg9xB/Z3MXK',
    );

    expect(result.algorithm).toBe('bcrypt');
    expect(result.params.cost).toBe(10);
    expect(result.params.variant).toBe('$2y$');
    expect(result.canGenerate).toBe(true);
  });

  it('identifica MD5 hex e lista os candidatos do mesmo tamanho', () => {
    const result = identifyHash('5d41402abc4b2a76b9719d911017c592');
    expect(result.algorithm).toBe('md5');
    expect(result.securityLevel).toBe('insecure');
    expect(result.warnings.join(' ')).toContain('NTLM');
  });

  it.each([
    [56, 'sha224'],
    [96, 'sha384'],
    [128, 'sha512'],
  ])('identifica digest hex de %i caracteres como %s', (length, algorithm) => {
    expect(identifyHash(c(length, 'F')).algorithm).toBe(algorithm);
  });

  it('aceita Argon2 com salt/hash de tamanho livre e sem v=', () => {
    const result = identifyHash(`$argon2i$m=4096,t=3,p=1$${c(11)}$${c(22)}`);
    expect(result.algorithm).toBe('argon2');
    expect(result.params.memoryCost).toBe(4096);
    expect(result.canGenerate).toBe(true);
  });

  it('aceita PBKDF2 do passlib com "." no base64 adaptado', () => {
    const result = identifyHash(
      '$pbkdf2-sha256$29000$N2YMIWQsBWBMae09x1jrPQ$1t8iyB2A.WF/Z5JZv.lfCIhXXN33N23OSgQYThBYRfk',
    );
    expect(result.algorithm).toBe('pbkdf2-sha256');
    expect(result.params.iterations).toBe(29000);
  });

  it('trata $H$ do phpBB3 como phpass portable, não bcrypt', () => {
    const result = identifyHash(`$H$9${c(8)}${c(22)}`);
    expect(result.algorithm).toBe('phpass');
    expect(result.params.variant).toBe('H');
    expect(result.label).toContain('phpBB3');
  });

  it('identifica MySQL 4.1+ e permite gerar', () => {
    const result = identifyHash(`*${c(40, 'A')}`);
    expect(result.algorithm).toBe('mysql41');
    expect(result.canGenerate).toBe(true);
  });

  it.each([
    [`$1$saltsalt$${c(22)}`, 'md5-crypt'],
    [`$apr1$saltsalt$${c(22)}`, 'md5-crypt'],
    [`$5$rounds=5000$saltstring$${c(43)}`, 'sha256-crypt'],
    [`$6$saltstring$${c(86)}`, 'sha512-crypt'],
    [`$y$j9T$F5Jx5fExrKuPp53xLKQ..1$${c(43)}`, 'yescrypt'],
    ['$bcrypt-sha256$v=2,t=2b,r=12$n79VH.0Q2TMWmt3Oqt9uku$Kq4Noyk3094Y2QlB8NdRT8SvGiI4ft2', 'bcrypt-sha256'],
    [`$pbkdf2$29000$${c(22)}$${c(27)}`, 'pbkdf2-sha1'],
    [`$S$D${c(51)}`, 'drupal7'],
    [`$8$${c(14)}$${c(43)}`, 'cisco'],
    [`$9$${c(14)}$${c(43)}`, 'cisco'],
    ['argon2$argon2id$v=19$m=102400,t=2,p=8$c2FsdA$aGFzaA', 'django'],
    ['bcrypt_sha256$$2b$12$abc', 'django'],
    ['pbkdf2:sha256:600000$Ab12Cd34$' + c(64, 'f'), 'werkzeug'],
    ['scrypt:32768:8:1$Ab12Cd34$' + c(128, 'f'), 'werkzeug'],
    ['{SSHA}W6ph5Mm5Pz8GgiULbPgzG37mj9g=', 'ldap'],
    [c(16, 'f'), 'mysql323'],
  ])('identifica %s como %s (somente identificação)', (hash, algorithm) => {
    const result = identifyHash(hash);
    expect(result.algorithm).toBe(algorithm);
    expect(result.canGenerate).toBe(false);
  });

  it('mantém desconhecido quando nada casa', () => {
    expect(identifyHash('isto-nao-e-um-hash').algorithm).toBe('unknown');
  });
});
