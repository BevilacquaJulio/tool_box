import { Injectable } from '@nestjs/common';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import type { DbVerifyConnectOptions, DbVerifySession } from './db-verify.types';

type QueryRow = RowDataPacket & Record<string, unknown>;

@Injectable()
export class DbVerifyRepository {
  async connect(options: DbVerifyConnectOptions): Promise<DbVerifySession> {
    const base = {
      host: options.host,
      port: options.port,
      user: options.user,
      password: options.password,
      database: options.database,
      connectTimeout: options.connectTimeout,
      enableKeepAlive: false,
      multipleStatements: false,
    };

    // Tenta TLS primeiro: servidores com require_secure_transport recusam texto puro, e a senha não
    // trafega aberta quando há suporte. O certificado não é validado porque o host é arbitrário (só
    // um teste de conexão). Sem suporte a TLS no servidor, repete sem criptografia.
    let connection: mysql.Connection;
    try {
      connection = await mysql.createConnection({ ...base, ssl: { rejectUnauthorized: false } });
    } catch (error) {
      if ((error as { code?: string }).code !== 'HANDSHAKE_NO_SSL_SUPPORT') {
        throw error;
      }
      connection = await mysql.createConnection(base);
    }

    return {
      query: async (sql, params) => {
        const [rows] = await connection.query({
          sql,
          values: params,
          timeout: options.queryTimeout,
        });
        return rows as QueryRow[];
      },
      end: async () => {
        await connection.end();
      },
    };
  }
}
