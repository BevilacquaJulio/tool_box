import type { HashAlgorithm, HashIdentification } from './types';

const phpassAlphabet = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function phpassCostFromChar(char: string): number {
  return phpassAlphabet.indexOf(char);
}

function simpleDigest(
  algorithm: HashAlgorithm,
  length: number,
): HashIdentification {
  const labels: Record<string, string> = {
    md5: 'MD5',
    sha1: 'SHA-1',
    sha256: 'SHA-256',
    sha512: 'SHA-512',
  };

  return {
    algorithm,
    label: labels[algorithm] ?? algorithm,
    description: `Digest ${labels[algorithm]} sem salt. Não é um hashing seguro de senha.`,
    securityLevel: 'insecure',
    params: { hashLength: length },
    format: `[${length} caracteres hex]`,
    canGenerate: true,
    warnings: [
      `${labels[algorithm]} não deve ser usado para armazenar senhas. Apenas para compatibilidade legada.`,
    ],
  };
}

function detectBcrypt(hash: string): HashIdentification | null {
  const match = hash.match(/^\$2([abxy])\$(\d{2})\$(.{53})$/);
  if (!match) {
    return null;
  }

  const [, variant, costStr] = match;
  const cost = Number.parseInt(costStr, 10);
  const variantLabel =
    variant === 'y'
      ? 'bcrypt (PHP $2y$)'
      : variant === 'a'
        ? 'bcrypt ($2a$)'
        : variant === 'b'
          ? 'bcrypt ($2b$)'
          : 'bcrypt ($2x$)';

  return {
    algorithm: 'bcrypt',
    label: variantLabel,
    description:
      'Algoritmo bcrypt com salt embutido. Comum em PHP, Laravel, Node.js e Ruby.',
    securityLevel: cost >= 10 ? 'strong' : cost >= 8 ? 'moderate' : 'weak',
    params: { variant: `$2${variant}$`, cost },
    format: `$2${variant}$${costStr}$[salt+hash]`,
    canGenerate: true,
    warnings: variant === 'y' ? ['O prefixo $2y$ é compatível com PHP.'] : [],
  };
}

function detectArgon2(hash: string): HashIdentification | null {
  const match = hash.match(
    /^\$argon2(id|i|d)\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]{22})\$([A-Za-z0-9+/]{43})$/,
  );
  if (!match) {
    return null;
  }

  const [, variant, , memoryCost, timeCost, parallelism] = match;
  const variantNames: Record<string, string> = {
    id: 'Argon2id',
    i: 'Argon2i',
    d: 'Argon2d',
  };

  return {
    algorithm: 'argon2',
    label: variantNames[variant] ?? 'Argon2',
    description: 'Algoritmo vencedor do Password Hashing Competition (2015).',
    securityLevel: 'strong',
    params: {
      variant,
      memoryCost: Number(memoryCost),
      timeCost: Number(timeCost),
      parallelism: Number(parallelism),
    },
    format: `$argon2${variant}$v=19$m=...,t=...,p=...[salt][hash]`,
    canGenerate: true,
    warnings: [],
  };
}

function detectScrypt(hash: string): HashIdentification | null {
  const match = hash.match(
    /^\$scrypt\$ln=(\d+),r=(\d+),p=(\d+)\$([A-Za-z0-9+/]{22,44})\$([A-Za-z0-9+/]{22,44})$/,
  );
  if (!match) {
    return null;
  }

  const [, logN, blockSize, parallelism] = match;

  return {
    algorithm: 'scrypt',
    label: 'scrypt',
    description: 'Função de derivação de chave com alto custo de memória.',
    securityLevel: 'strong',
    params: {
      logN: Number(logN),
      blockSize: Number(blockSize),
      parallelism: Number(parallelism),
    },
    format: '$scrypt$ln=...,r=...,p=...[salt][hash]',
    canGenerate: true,
    warnings: [],
  };
}

function detectPhpass(hash: string): HashIdentification | null {
  const match = hash.match(/^\$([PH])\$([./0-9A-Za-z])([./0-9A-Za-z]{8})([./0-9A-Za-z]{22})$/);
  if (!match) {
    return null;
  }

  const [, type, costChar] = match;
  const cost = phpassCostFromChar(costChar);
  const isBcrypt = type === 'H';

  return {
    algorithm: 'phpass',
    label: isBcrypt ? 'phpass (bcrypt)' : 'phpass (portable MD5)',
    description: isBcrypt
      ? 'WordPress phpass usando bcrypt como backend.'
      : 'Hash portable baseado em MD5. Comum em WordPress antigo.',
    securityLevel: isBcrypt ? 'strong' : 'weak',
    params: { variant: type, cost },
    format: `$${type}$[cost][salt][hash]`,
    canGenerate: true,
    warnings: isBcrypt
      ? []
      : ['phpass portable usa MD5 iterado. Considere migrar para bcrypt ou Argon2.'],
  };
}

function detectPbkdf2(hash: string): HashIdentification | null {
  const sha256 = hash.match(
    /^\$pbkdf2-sha256\$(\d+)\$([A-Za-z0-9+/=]{22,44})\$([A-Za-z0-9+/=]{22,64})$/,
  );
  if (sha256) {
    const [, iterations] = sha256;
    const iter = Number(iterations);
    return {
      algorithm: 'pbkdf2-sha256',
      label: 'PBKDF2-SHA256',
      description: 'PBKDF2 com SHA-256. Formato modular crypt.',
      securityLevel: iter >= 100_000 ? 'strong' : iter >= 10_000 ? 'moderate' : 'weak',
      params: { iterations: iter },
      format: '$pbkdf2-sha256$[iterations]$[salt]$[hash]',
      canGenerate: true,
      warnings: [],
    };
  }

  const sha512 = hash.match(
    /^\$pbkdf2-sha512\$(\d+)\$([A-Za-z0-9+/=]{22,44})\$([A-Za-z0-9+/=]{22,128})$/,
  );
  if (sha512) {
    const [, iterations] = sha512;
    const iter = Number(iterations);
    return {
      algorithm: 'pbkdf2-sha512',
      label: 'PBKDF2-SHA512',
      description: 'PBKDF2 com SHA-512. Formato modular crypt.',
      securityLevel: iter >= 100_000 ? 'strong' : iter >= 10_000 ? 'moderate' : 'weak',
      params: { iterations: iter },
      format: '$pbkdf2-sha512$[iterations]$[salt]$[hash]',
      canGenerate: true,
      warnings: [],
    };
  }

  return null;
}

function detectDjangoPbkdf2(hash: string): HashIdentification | null {
  const match = hash.match(/^pbkdf2_sha256\$(\d+)\$([A-Za-z0-9+/=]+)\$([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return null;
  }

  const [, iterations] = match;
  const iter = Number(iterations);

  return {
    algorithm: 'django-pbkdf2-sha256',
    label: 'Django PBKDF2-SHA256',
    description: 'Formato padrão de senha do Django.',
    securityLevel: iter >= 390_000 ? 'strong' : iter >= 100_000 ? 'moderate' : 'weak',
    params: { djangoIterations: iter },
    format: 'pbkdf2_sha256$[iterations]$[salt]$[hash]',
    canGenerate: true,
    warnings: [],
  };
}

const detectors: Array<(value: string) => HashIdentification | null> = [
  detectBcrypt,
  detectArgon2,
  detectScrypt,
  detectPhpass,
  detectPbkdf2,
  detectDjangoPbkdf2,
  (hash) => (/^[a-f0-9]{128}$/i.test(hash) ? simpleDigest('sha512', 128) : null),
  (hash) => (/^[a-f0-9]{64}$/i.test(hash) ? simpleDigest('sha256', 64) : null),
  (hash) => (/^[a-f0-9]{40}$/i.test(hash) ? simpleDigest('sha1', 40) : null),
  (hash) => (/^[a-f0-9]{32}$/i.test(hash) ? simpleDigest('md5', 32) : null),
];

export function identifyHash(rawHash: string): HashIdentification {
  const hash = rawHash.trim();

  for (const detect of detectors) {
    const result = detect(hash);
    if (result) {
      return result;
    }
  }

  return {
    algorithm: 'unknown',
    label: 'Desconhecido',
    description: 'Formato de hash não reconhecido.',
    securityLevel: 'insecure',
    params: {},
    format: 'unknown',
    canGenerate: false,
    warnings: [
      'Não foi possível identificar o algoritmo. Verifique se o hash está completo.',
    ],
  };
}
