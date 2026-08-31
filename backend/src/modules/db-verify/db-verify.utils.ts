import { isIP } from 'node:net';
import type { DbVerifyErrorType } from './db-verify.types';

export type DbVerifyErrorDetails = {
  type: DbVerifyErrorType;
  label: string;
  message: string;
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

const BLOCKED_HOSTS = new Set([
  'metadata.google.internal',
  'metadata.google',
  'metadata',
  'metadata.internal',
  'instance-data',
]);

export function normalizeHost(rawHost: string): string {
  const trimmed = rawHost.trim().toLowerCase();
  return trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
}

export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const parts = ip.split('.').map((part) => Number(part));
    const [a, b] = parts;
    if (a === 0 || a === 255) {
      return true;
    }
    if (a === 169 && b === 254) {
      return true;
    }
    if (a >= 224) {
      return true;
    }
    return false;
  }

  if (version === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === '::' || normalized.startsWith('fe80:') || normalized.startsWith('ff')) {
      return true;
    }
    if (normalized === '::ffff:169.254.169.254') {
      return true;
    }
    return false;
  }

  return false;
}

export function assertAllowedHost(host: string): void {
  const normalized = normalizeHost(host);

  if (!normalized) {
    throw new Error('Informe um host valido.');
  }

  if (normalized.includes('@') || normalized.includes('://') || normalized.includes('/') || normalized.includes('?')) {
    throw new Error('Informe apenas o host, sem protocolo, caminho ou credenciais.');
  }

  if (BLOCKED_HOSTS.has(normalized)) {
    throw new Error('Host nao permitido para teste de conexao.');
  }

  if (isIP(normalized)) {
    if (isBlockedIp(normalized)) {
      throw new Error('Host nao permitido para teste de conexao.');
    }
    return;
  }

  if (!/^[a-z0-9._-]+$/.test(normalized)) {
    throw new Error('Informe um host valido.');
  }
}

export function sanitizeDatabaseName(name: string): string {
  const trimmed = name.trim();
  if (!/^[A-Za-z0-9_$-]+$/.test(trimmed)) {
    throw new Error('Nome do banco contem caracteres invalidos.');
  }
  return trimmed;
}

export function classifyConnectionError(error: unknown): DbVerifyErrorDetails {
  if (!(error instanceof Error)) {
    return {
      type: 'unknown',
      label: DB_VERIFY_ERROR_LABELS.unknown,
      message: 'Falha desconhecida ao conectar ao banco.',
    };
  }

  const code = (error as NodeJS.ErrnoException & { code?: string }).code;
  const mysqlCode = (error as { errno?: number }).errno;
  const message = error.message.toLowerCase();

  if (
    message.includes('informe um host') ||
    message.includes('host nao permitido') ||
    message.includes('sem protocolo') ||
    message.includes('informe um usuario') ||
    message.includes('nome do banco contem')
  ) {
    return {
      type: 'validation',
      label: DB_VERIFY_ERROR_LABELS.validation,
      message: error.message,
    };
  }

  if (
    message.includes('nome do banco') ||
    message.includes('schema nao encontrado') ||
    message.includes('sessao conectou')
  ) {
    return {
      type: 'database',
      label: DB_VERIFY_ERROR_LABELS.database,
      message: error.message,
    };
  }

  if (code === 'ENOTFOUND') {
    return {
      type: 'host',
      label: DB_VERIFY_ERROR_LABELS.host,
      message: 'Host nao encontrado. Verifique o endereco informado.',
    };
  }

  if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
    return {
      type: 'timeout',
      label: DB_VERIFY_ERROR_LABELS.timeout,
      message: 'Tempo esgotado ao conectar. Verifique host, porta e firewall.',
    };
  }

  if (code === 'ECONNREFUSED') {
    return {
      type: 'port',
      label: DB_VERIFY_ERROR_LABELS.port,
      message: 'Conexao recusada. Verifique se o servico esta ativo e se a porta esta correta.',
    };
  }

  if (mysqlCode === 1045) {
    return {
      type: 'credentials',
      label: DB_VERIFY_ERROR_LABELS.credentials,
      message: 'Usuario ou senha incorretos.',
    };
  }

  if (mysqlCode === 1049) {
    return {
      type: 'database',
      label: DB_VERIFY_ERROR_LABELS.database,
      message: 'Banco de dados inexistente ou inacessivel com este usuario.',
    };
  }

  if (mysqlCode === 1044) {
    return {
      type: 'permission',
      label: DB_VERIFY_ERROR_LABELS.permission,
      message: 'Usuario sem permissao para acessar este banco de dados.',
    };
  }

  if (mysqlCode === 1130) {
    return {
      type: 'permission',
      label: DB_VERIFY_ERROR_LABELS.permission,
      message: 'Host do cliente nao autorizado a conectar neste servidor MySQL.',
    };
  }

  if (mysqlCode === 1142 || mysqlCode === 1143 || mysqlCode === 1370) {
    return {
      type: 'permission',
      label: DB_VERIFY_ERROR_LABELS.permission,
      message: 'Usuario sem permissao suficiente para executar as verificacoes.',
    };
  }

  if (mysqlCode === 2002 || mysqlCode === 2003) {
    return {
      type: 'port',
      label: DB_VERIFY_ERROR_LABELS.port,
      message: 'Nao foi possivel alcancar o servidor no host/porta informados.',
    };
  }

  if (message.includes('escrita temporaria') || message.includes('create temporary')) {
    return {
      type: 'permission',
      label: DB_VERIFY_ERROR_LABELS.permission,
      message: 'Usuario sem permissao suficiente para executar as verificacoes.',
    };
  }

  return {
    type: 'unknown',
    label: DB_VERIFY_ERROR_LABELS.unknown,
    message: 'Falha ao validar a conexao com o banco.',
  };
}
