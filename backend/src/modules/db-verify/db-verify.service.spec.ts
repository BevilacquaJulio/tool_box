import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { DbVerifyRepository } from './db-verify.repository';
import { DbVerifyService } from './db-verify.service';
import type { DbVerifySession } from './db-verify.types';

describe('DbVerifyService', () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'DB_VERIFY_CONNECT_TIMEOUT_MS') {
        return 2000;
      }
      if (key === 'DB_VERIFY_QUERY_TIMEOUT_MS') {
        return 2000;
      }
      return undefined;
    }),
  } as unknown as ConfigService<EnvConfig, true>;

  const connect = jest.fn();
  const repository = { connect } as unknown as DbVerifyRepository;

  const service = new DbVerifyService(configService, repository);

  beforeEach(() => {
    connect.mockReset();
  });

  it('rejects metadata hosts before opening a connection', async () => {
    await expect(
      service.verify({
        host: '169.254.169.254',
        port: 3306,
        database: 'app',
        username: 'root',
        password: 'secret',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(connect).not.toHaveBeenCalled();
  });

  it('returns a successful probe when the repository answers expected rows', async () => {
    const end = jest.fn().mockResolvedValue(undefined);
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT 1')) {
        return [{ ping: 1 }];
      }
      if (sql.includes('DATABASE()')) {
        return [{ activeDatabase: 'app' }];
      }
      if (sql.includes('SCHEMATA')) {
        return [{ SCHEMA_NAME: 'app' }];
      }
      if (sql.includes('COUNT(*)')) {
        return [{ tableCount: 3 }];
      }
      if (sql.includes('VERSION()')) {
        return [
          {
            serverVersion: '8.0.0',
            charset: 'utf8mb4',
            collation: 'utf8mb4_unicode_ci',
            connectionId: 9,
            maxConnections: 100,
          },
        ];
      }
      return [{ id: 1 }];
    });

    connect.mockResolvedValue({ query, end } satisfies DbVerifySession);

    const result = await service.verify({
      host: '127.0.0.1',
      port: 3306,
      database: 'app',
      username: 'root',
      password: 'secret',
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.tableCount).toBe(3);
    expect(end).toHaveBeenCalled();
  });

  it('maps connection refusal without leaking the original error', async () => {
    connect.mockRejectedValue(Object.assign(new Error('connect ECONNREFUSED 10.0.0.8:3306'), { code: 'ECONNREFUSED' }));

    const result = await service.verify({
      host: '10.0.0.8',
      port: 3306,
      database: 'app',
      username: 'root',
      password: 'secret',
    });

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('port');
    expect(result.summary).not.toMatch(/10\.0\.0\.8/);
  });

  function healthySession(overrides: Record<string, (sql: string) => unknown> = {}) {
    const end = jest.fn().mockResolvedValue(undefined);
    const query = jest.fn(async (sql: string) => {
      for (const [needle, answer] of Object.entries(overrides)) {
        if (sql.includes(needle)) {
          return answer(sql);
        }
      }
      if (sql.includes('SELECT 1')) return [{ ping: 1 }];
      if (sql.includes('DATABASE()')) return [{ activeDatabase: 'app' }];
      if (sql.includes('SCHEMATA')) return [{ SCHEMA_NAME: 'app' }];
      if (sql.includes('COUNT(*)')) return [{ tableCount: 3 }];
      if (sql.includes('SHOW GRANTS')) return [{ grants: 'GRANT SELECT, INSERT ON `app`.* TO `u`@`%`' }];
      if (sql.includes('Ssl_version')) return [{ Variable_name: 'Ssl_version', Value: 'TLSv1.3' }];
      if (sql.includes('VERSION()')) {
        return [{ serverVersion: '8.4.0', charset: 'utf8mb4', collation: 'utf8mb4_0900_ai_ci', connectionId: 9, maxConnections: 100 }];
      }
      return [{ id: 1 }];
    });
    return { query, end } satisfies DbVerifySession;
  }

  const input = { host: '127.0.0.1', port: 3306, database: 'app', username: 'u', password: 'secret' };

  it('treats missing CREATE TEMPORARY TABLES privilege as a warning, not a failed connection', async () => {
    connect.mockResolvedValue(
      healthySession({
        'CREATE TEMPORARY TABLE': () => {
          throw Object.assign(new Error('CREATE TEMPORARY TABLES command denied'), { errno: 1044 });
        },
      }),
    );

    const result = await service.verify(input);

    expect(result.success).toBe(true);
    expect(result.checks.find((check) => check.id === 'temp-write')?.status).toBe('warning');
    expect(result.summary).toMatch(/aviso/i);
    expect(result.metadata?.serverVersion).toBe('8.4.0');
  });

  it('accepts the active database case-insensitively (lower_case_table_names=1)', async () => {
    connect.mockResolvedValue(healthySession({ 'DATABASE()': () => [{ activeDatabase: 'app' }] }));

    const result = await service.verify({ ...input, database: 'App' });

    expect(result.success).toBe(true);
    expect(result.checks.find((check) => check.id === 'active-db')?.status).toBe('passed');
  });

  it('reports TLS version and the privileges granted on the database', async () => {
    connect.mockResolvedValue(healthySession());

    const result = await service.verify(input);

    expect(result.metadata?.tlsVersion).toBe('TLSv1.3');
    expect(result.checks.find((check) => check.id === 'grants')).toMatchObject({
      status: 'passed',
      message: expect.stringContaining('SELECT, INSERT'),
    });
  });

  it('flags a connection without TLS as a warning', async () => {
    connect.mockResolvedValue(healthySession({ Ssl_version: () => [{ Variable_name: 'Ssl_version', Value: '' }] }));

    const result = await service.verify(input);

    expect(result.success).toBe(true);
    expect(result.metadata?.tlsVersion).toBeNull();
    expect(result.checks.find((check) => check.id === 'tls')?.status).toBe('warning');
  });
});
