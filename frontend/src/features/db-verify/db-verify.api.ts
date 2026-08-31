import { apiRequest } from '../../lib/api';
import type { DbVerifyInput, DbVerifyResult } from './db-verify.types';

export async function testDbConnection(input: DbVerifyInput): Promise<DbVerifyResult> {
  return apiRequest<DbVerifyResult>('/db-verify/test', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
