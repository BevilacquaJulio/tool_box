import { Injectable } from '@nestjs/common';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import type { DbVerifyConnectOptions, DbVerifySession } from './db-verify.types';

type QueryRow = RowDataPacket & Record<string, unknown>;

@Injectable()
export class DbVerifyRepository {
  async connect(options: DbVerifyConnectOptions): Promise<DbVerifySession> {
    const connection = await mysql.createConnection({
      host: options.host,
      port: options.port,
      user: options.user,
      password: options.password,
      database: options.database,
      connectTimeout: options.connectTimeout,
      enableKeepAlive: false,
      multipleStatements: false,
      ssl: undefined,
    });

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
