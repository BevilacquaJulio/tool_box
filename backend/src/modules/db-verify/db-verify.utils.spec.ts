import { assertAllowedHost, classifyConnectionError, isBlockedIp, sanitizeDatabaseName } from './db-verify.utils';

describe('db-verify.utils', () => {
  it('rejects blocked cloud metadata hosts', () => {
    expect(() => assertAllowedHost('metadata.google.internal')).toThrow(/nao permitido/i);
  });

  it('rejects link-local metadata IP', () => {
    expect(() => assertAllowedHost('169.254.169.254')).toThrow(/nao permitido/i);
    expect(isBlockedIp('169.254.169.254')).toBe(true);
  });

  it('rejects host with protocol or userinfo', () => {
    expect(() => assertAllowedHost('mysql://db.exemplo.com')).toThrow(/apenas o host/i);
    expect(() => assertAllowedHost('user@db.exemplo.com')).toThrow(/apenas o host/i);
    expect(() => assertAllowedHost('127.0.0.1;drop')).toThrow(/host valido/i);
  });

  it('allows private and loopback hosts used by the tool', () => {
    expect(() => assertAllowedHost('127.0.0.1')).not.toThrow();
    expect(() => assertAllowedHost('192.168.1.10')).not.toThrow();
    expect(() => assertAllowedHost('db.interno.local')).not.toThrow();
  });

  it('classifies unknown host as host error', () => {
    const error = Object.assign(new Error('getaddrinfo ENOTFOUND db.invalido'), { code: 'ENOTFOUND' });
    expect(classifyConnectionError(error)).toMatchObject({
      type: 'host',
    });
  });

  it('classifies auth failure as credentials error', () => {
    const error = Object.assign(new Error('Access denied'), { errno: 1045 });
    expect(classifyConnectionError(error)).toMatchObject({
      type: 'credentials',
    });
  });

  it('classifies missing database as database error', () => {
    const error = Object.assign(new Error('Unknown database'), { errno: 1049 });
    expect(classifyConnectionError(error)).toMatchObject({
      type: 'database',
    });
  });

  it('does not leak unknown driver messages', () => {
    const error = new Error('Table `users` does not exist at /var/lib/mysql');
    expect(classifyConnectionError(error).message).toBe('Falha ao validar a conexao com o banco.');
  });

  it('sanitizes database names', () => {
    expect(sanitizeDatabaseName('app_db-1')).toBe('app_db-1');
    expect(() => sanitizeDatabaseName('app;drop')).toThrow(/invalidos/i);
    expect(() => sanitizeDatabaseName("db' OR 1=1")).toThrow(/invalidos/i);
  });
});
