import { describe, expect, it } from 'vitest';
import { identifyHash } from './identify';

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

  it('identifica MD5 hex', () => {
    const result = identifyHash('5d41402abc4b2a76b9719d911017c592');
    expect(result.algorithm).toBe('md5');
    expect(result.securityLevel).toBe('insecure');
  });
});
