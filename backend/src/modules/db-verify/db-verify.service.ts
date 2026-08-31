import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import type { EnvConfig } from '../../config/env.validation';
import { DbVerifyRepository } from './db-verify.repository';
import type {
  DbVerifyCheck,
  DbVerifyInput,
  DbVerifyMetadata,
  DbVerifyResult,
  DbVerifySession,
} from './db-verify.types';
import {
  assertAllowedHost,
  classifyConnectionError,
  normalizeHost,
  sanitizeDatabaseName,
} from './db-verify.utils';

@Injectable()
export class DbVerifyService {
  constructor(
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly dbVerifyRepository: DbVerifyRepository,
  ) {}

  async verify(input: DbVerifyInput): Promise<DbVerifyResult> {
    const startedAt = Date.now();
    const checks: DbVerifyCheck[] = [];
    let session: DbVerifySession | null = null;
    let metadata: DbVerifyMetadata | null = null;

    const host = normalizeHost(input.host);
    const username = input.username.trim();
    const password = input.password ?? '';

    try {
      assertAllowedHost(host);
      const database = sanitizeDatabaseName(input.database);

      const connectTimeout = this.configService.get('DB_VERIFY_CONNECT_TIMEOUT_MS', {
        infer: true,
      });
      const queryTimeout = this.configService.get('DB_VERIFY_QUERY_TIMEOUT_MS', { infer: true });

      const connectStarted = Date.now();
      session = await this.dbVerifyRepository.connect({
        host,
        port: input.port,
        user: username,
        password,
        database,
        connectTimeout,
        queryTimeout,
      });

      checks.push({
        id: 'tcp-auth',
        label: 'Conexao TCP + autenticacao',
        status: 'passed',
        message: 'Conexao estabelecida e credenciais aceitas pelo servidor.',
        durationMs: Date.now() - connectStarted,
      });

      await this.runCheck(checks, 'ping', 'Ping do servidor (SELECT 1)', async () => {
        const rows = await session!.query('SELECT 1 AS ping');
        if (rows[0]?.ping !== 1) {
          throw new Error('Resposta inesperada ao ping do banco.');
        }
      });

      let activeDatabase: string | null = null;
      await this.runCheck(checks, 'active-db', 'Banco ativo na sessao', async () => {
        const rows = await session!.query('SELECT DATABASE() AS activeDatabase');
        activeDatabase = typeof rows[0]?.activeDatabase === 'string' ? rows[0].activeDatabase : null;
        if (activeDatabase !== database) {
          throw new Error(
            `Sessao conectou em "${activeDatabase ?? 'null'}", mas foi solicitado "${database}".`,
          );
        }
      });

      await this.runCheck(checks, 'schema-exists', 'Existencia do schema informado', async () => {
        const rows = await session!.query(
          'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1',
          [database],
        );
        if (rows.length === 0) {
          throw new Error('Schema nao encontrado em information_schema.');
        }
      });

      let tableCount: number | null = null;
      await this.runCheck(checks, 'schema-read', 'Leitura de metadados do schema', async () => {
        const rows = await session!.query(
          'SELECT COUNT(*) AS tableCount FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
          [database],
        );
        tableCount = Number(rows[0]?.tableCount ?? 0);
        if (!Number.isFinite(tableCount)) {
          throw new Error('Nao foi possivel ler metadados do schema.');
        }
      });

      await this.runCheck(checks, 'temp-write', 'Escrita temporaria (CREATE/DROP TEMP TABLE)', async () => {
        const tempName = `__toolbox_verify_${randomBytes(6).toString('hex')}`;
        await session!.query(`CREATE TEMPORARY TABLE \`${tempName}\` (id INT PRIMARY KEY)`);
        await session!.query(`INSERT INTO \`${tempName}\` (id) VALUES (1)`);
        const rows = await session!.query(`SELECT id FROM \`${tempName}\` LIMIT 1`);
        if (Number(rows[0]?.id) !== 1) {
          throw new Error('Falha ao validar escrita temporaria.');
        }
        await session!.query(`DROP TEMPORARY TABLE \`${tempName}\``);
      });

      let metadataRows: Array<Record<string, unknown>> = [];
      await this.runCheck(checks, 'server-metadata', 'Metadados do servidor', async () => {
        metadataRows = await session!.query(`SELECT
            VERSION() AS serverVersion,
            @@character_set_database AS charset,
            @@collation_database AS collation,
            CONNECTION_ID() AS connectionId,
            @@max_connections AS maxConnections`);
      });

      metadata = {
        serverVersion: String(metadataRows[0]?.serverVersion ?? ''),
        activeDatabase,
        charset: metadataRows[0]?.charset ? String(metadataRows[0].charset) : null,
        collation: metadataRows[0]?.collation ? String(metadataRows[0].collation) : null,
        connectionId:
          metadataRows[0]?.connectionId !== undefined ? Number(metadataRows[0].connectionId) : null,
        maxConnections:
          metadataRows[0]?.maxConnections !== undefined
            ? Number(metadataRows[0].maxConnections)
            : null,
        tableCount,
      };

      return {
        success: true,
        summary:
          'Conexao validada com sucesso. Host, credenciais, schema e permissoes basicas estao corretos.',
        checks,
        metadata,
        totalDurationMs: Date.now() - startedAt,
      };
    } catch (error) {
      const classified = classifyConnectionError(error);

      if (classified.type === 'validation') {
        throw new BadRequestException(classified.message);
      }

      if (checks.length === 0) {
        checks.push({
          id: 'tcp-auth',
          label: 'Conexao TCP + autenticacao',
          status: 'failed',
          message: classified.message,
          durationMs: Date.now() - startedAt,
        });
      } else {
        checks.push({
          id: 'failure',
          label: 'Validacao interrompida',
          status: 'failed',
          message: classified.message,
          durationMs: Date.now() - startedAt,
        });
      }

      return {
        success: false,
        summary: classified.message,
        errorType: classified.type,
        errorLabel: classified.label,
        checks,
        metadata,
        totalDurationMs: Date.now() - startedAt,
      };
    } finally {
      if (session) {
        await session.end().catch(() => undefined);
      }
    }
  }

  private async runCheck(
    checks: DbVerifyCheck[],
    id: string,
    label: string,
    action: () => Promise<void>,
  ): Promise<void> {
    const started = Date.now();
    try {
      await action();
      checks.push({
        id,
        label,
        status: 'passed',
        message: 'OK',
        durationMs: Date.now() - started,
      });
    } catch (error) {
      const classified = classifyConnectionError(error);
      checks.push({
        id,
        label,
        status: 'failed',
        message: classified.message,
        durationMs: Date.now() - started,
      });
      throw error;
    }
  }
}
