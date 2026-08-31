export type DbVerifyCheckStatus = 'passed' | 'failed' | 'warning';

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

export type DbVerifyErrorType =
  | 'host'
  | 'port'
  | 'credentials'
  | 'database'
  | 'permission'
  | 'timeout'
  | 'validation'
  | 'unknown';

export type DbVerifyInput = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
};

export type DbVerifySession = {
  query: (sql: string, params?: unknown[]) => Promise<Array<Record<string, unknown>>>;
  end: () => Promise<void>;
};

export type DbVerifyConnectOptions = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectTimeout: number;
  queryTimeout: number;
};
