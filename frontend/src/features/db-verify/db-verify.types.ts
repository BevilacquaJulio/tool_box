export type DbVerifyCheckStatus = 'passed' | 'failed' | 'warning';

export type DbVerifyErrorType =
  | 'host'
  | 'port'
  | 'credentials'
  | 'database'
  | 'permission'
  | 'timeout'
  | 'validation'
  | 'unknown';

export type DbVerifyCheck = {
  id: string;
  label: string;
  status: DbVerifyCheckStatus;
  message: string;
  durationMs: number;
};

export type DbVerifyMetadata = {
  serverVersion: string;
  activeDatabase: string | null;
  charset: string | null;
  collation: string | null;
  connectionId: number | null;
  maxConnections: number | null;
  tableCount: number | null;
};

export type DbVerifyResult = {
  success: boolean;
  summary: string;
  errorType?: DbVerifyErrorType;
  errorLabel?: string;
  checks: DbVerifyCheck[];
  metadata: DbVerifyMetadata | null;
  totalDurationMs: number;
};

export type DbVerifyInput = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
};

export const DB_VERIFY_ERROR_LABELS: Record<DbVerifyErrorType, string> = {
  host: 'Host',
  port: 'Porta ou rede',
  credentials: 'Usuario ou senha',
  database: 'Nome do banco',
  permission: 'Permissao',
  timeout: 'Tempo esgotado',
  validation: 'Dados invalidos',
  unknown: 'Erro desconhecido',
};
