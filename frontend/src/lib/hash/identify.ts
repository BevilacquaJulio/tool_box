import type { HashAlgorithm, HashIdentification, HashSecurityLevel } from './types';

const phpassAlphabet = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// Base64 padrão e "adapted base64" do passlib (usa "." no lugar de "+").
const B64 = '[A-Za-z0-9+/.]';

function phpassCostFromChar(char: string): number {
  return phpassAlphabet.indexOf(char);
}

const digestLabels: Record<string, string> = {
  md5: 'MD5',
  sha1: 'SHA-1',
  sha224: 'SHA-224',
  sha256: 'SHA-256',
  sha384: 'SHA-384',
  sha512: 'SHA-512',
};

// Hex puro não carrega o algoritmo: o tamanho só indica os candidatos.
const sameLengthDigests: Record<number, string> = {
  32: 'NTLM, MD4, LM, RIPEMD-128',
  40: 'RIPEMD-160, MySQL 4.1+ sem o "*"',
  56: 'SHA3-224, SHA-512/224',
  64: 'SHA3-256, Keccak-256, BLAKE2s-256, SHA-512/256',
  96: 'SHA3-384',
  128: 'SHA3-512, BLAKE2b-512, Whirlpool',
};

function simpleDigest(algorithm: HashAlgorithm, length: number): HashIdentification {
  const label = digestLabels[algorithm] ?? algorithm;

  return {
    algorithm,
    label,
    description: `Digest ${label} sem salt. Não é um hashing seguro de senha.`,
    securityLevel: 'insecure',
    params: { hashLength: length },
    format: `[${length} caracteres hex]`,
    canGenerate: true,
    warnings: [
      `${label} não deve ser usado para armazenar senhas. Apenas para compatibilidade legada.`,
      `Mesmo tamanho de: ${sameLengthDigests[length]}. Confirme a origem do hash; o mais comum foi assumido.`,
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
  // Salt e hash têm tamanho configurável; hashes antigos (v1.0) não têm "v=".
  const match = hash.match(
    /^\$argon2(id|i|d)\$(?:v=(\d+)\$)?m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/,
  );
  if (!match) {
    return null;
  }

  const [, variant, version, memoryCost, timeCost, parallelism] = match;
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
    format: `$argon2${variant}$v=${version ?? '16'}$m=...,t=...,p=...[salt][hash]`,
    canGenerate: true,
    warnings: version ? [] : ['Hash sem "v=" (Argon2 1.0). O novo hash será gerado na versão 1.3 (v=19).'],
  };
}

function detectScrypt(hash: string): HashIdentification | null {
  const match = hash.match(
    new RegExp(`^\\$scrypt\\$ln=(\\d+),r=(\\d+),p=(\\d+)\\$(${B64}+)\\$(${B64}+)$`),
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

  // $H$ é só o prefixo do phpBB3 para o mesmo algoritmo portable MD5 do $P$.
  return {
    algorithm: 'phpass',
    label: type === 'H' ? 'phpass (phpBB3 $H$)' : 'phpass (WordPress $P$)',
    description: 'Hash portable do phpass baseado em MD5 iterado. Comum em WordPress e phpBB.',
    securityLevel: 'weak',
    params: { variant: type, cost },
    format: `$${type}$[cost][salt][hash]`,
    canGenerate: true,
    warnings: ['phpass portable usa MD5 iterado. Considere migrar para bcrypt ou Argon2.'],
  };
}

function detectPbkdf2(hash: string): HashIdentification | null {
  const match = hash.match(
    new RegExp(`^\\$pbkdf2-(sha256|sha512)\\$(\\d+)\\$(${B64}+=*)\\$(${B64}+=*)$`),
  );
  if (!match) {
    return null;
  }

  const [, digest, iterations] = match;
  const iter = Number(iterations);
  const label = digest === 'sha512' ? 'PBKDF2-SHA512' : 'PBKDF2-SHA256';

  return {
    algorithm: digest === 'sha512' ? 'pbkdf2-sha512' : 'pbkdf2-sha256',
    label,
    description: `PBKDF2 com ${digest === 'sha512' ? 'SHA-512' : 'SHA-256'}. Formato modular crypt (passlib).`,
    securityLevel: iter >= 100_000 ? 'strong' : iter >= 10_000 ? 'moderate' : 'weak',
    params: { iterations: iter },
    format: `$pbkdf2-${digest}$[iterations]$[salt]$[hash]`,
    canGenerate: true,
    warnings: [],
  };
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

function detectMysql41(hash: string): HashIdentification | null {
  if (!/^\*[A-F0-9]{40}$/i.test(hash)) {
    return null;
  }

  return {
    algorithm: 'mysql41',
    label: 'MySQL 4.1+ (mysql_native_password)',
    description: 'SHA-1 duplo usado pelo plugin mysql_native_password do MySQL/MariaDB.',
    securityLevel: 'insecure',
    params: {},
    format: '*[40 caracteres hex maiúsculos]',
    canGenerate: true,
    warnings: ['Sem salt: o mesmo valor gera sempre o mesmo hash. Prefira caching_sha2_password.'],
  };
}

type KnownFormat = {
  pattern: RegExp;
  algorithm: HashAlgorithm;
  label: string;
  description: string;
  securityLevel: HashSecurityLevel;
  format: string;
};

// Formatos reconhecidos sem gerador implementado. A ordem importa: prefixos específicos antes dos genéricos.
const identifyOnlyFormats: KnownFormat[] = [
  {
    pattern: /^\$1\$[^$]{0,8}\$[./0-9A-Za-z]{22}$/,
    algorithm: 'md5-crypt',
    label: 'MD5-crypt ($1$)',
    description: 'crypt() baseado em MD5. Comum em /etc/shadow antigo, Cisco IOS e FreeBSD.',
    securityLevel: 'weak',
    format: '$1$[salt]$[hash]',
  },
  {
    pattern: /^\$apr1\$[^$]{0,8}\$[./0-9A-Za-z]{22}$/,
    algorithm: 'md5-crypt',
    label: 'Apache MD5 ($apr1$)',
    description: 'Variante do MD5-crypt usada pelo htpasswd do Apache.',
    securityLevel: 'weak',
    format: '$apr1$[salt]$[hash]',
  },
  {
    pattern: /^\$5\$(?:rounds=\d+\$)?[^$]{0,16}\$[./0-9A-Za-z]{43}$/,
    algorithm: 'sha256-crypt',
    label: 'SHA256-crypt ($5$)',
    description: 'crypt() baseado em SHA-256 (glibc). Usado em /etc/shadow.',
    securityLevel: 'moderate',
    format: '$5$[rounds=N$][salt]$[hash]',
  },
  {
    pattern: /^\$6\$(?:rounds=\d+\$)?[^$]{0,16}\$[./0-9A-Za-z]{86}$/,
    algorithm: 'sha512-crypt',
    label: 'SHA512-crypt ($6$)',
    description: 'crypt() baseado em SHA-512 (glibc). Padrão antigo do /etc/shadow no Linux.',
    securityLevel: 'moderate',
    format: '$6$[rounds=N$][salt]$[hash]',
  },
  {
    pattern: /^\$(?:y|gy|7)\$[./0-9A-Za-z]+\$[./0-9A-Za-z]*\$?[./0-9A-Za-z]{43}$/,
    algorithm: 'yescrypt',
    label: 'yescrypt / scrypt do libxcrypt ($y$, $7$)',
    description: 'Padrão atual do /etc/shadow no Debian, Ubuntu e Fedora ($y$); $7$ é o scrypt do libxcrypt.',
    securityLevel: 'strong',
    format: '$y$[params]$[salt]$[hash]',
  },
  {
    pattern: /^\$bcrypt-sha256\$/,
    algorithm: 'bcrypt-sha256',
    label: 'bcrypt-sha256 (passlib)',
    description: 'bcrypt aplicado sobre SHA-256 da senha, para aceitar senhas acima de 72 bytes.',
    securityLevel: 'strong',
    format: '$bcrypt-sha256$v=2,t=2b,r=[cost]$[salt]$[hash]',
  },
  {
    pattern: new RegExp(`^\\$pbkdf2\\$\\d+\\$${B64}+\\$${B64}+$`),
    algorithm: 'pbkdf2-sha1',
    label: 'PBKDF2-SHA1 (passlib)',
    description: 'PBKDF2 com HMAC-SHA1 no formato modular crypt do passlib.',
    securityLevel: 'moderate',
    format: '$pbkdf2$[iterations]$[salt]$[hash]',
  },
  {
    pattern: /^\$S\$[./0-9A-Za-z]{52}$/,
    algorithm: 'drupal7',
    label: 'Drupal 7 ($S$)',
    description: 'Variante do phpass com SHA-512 usada pelo Drupal 7.',
    securityLevel: 'moderate',
    format: '$S$[cost][salt][hash]',
  },
  {
    pattern: /^\$8\$[./0-9A-Za-z]{14}\$[./0-9A-Za-z]{43}$/,
    algorithm: 'cisco',
    label: 'Cisco tipo 8 ($8$)',
    description: 'PBKDF2-SHA256 usado em senhas "secret 8" do Cisco IOS.',
    securityLevel: 'strong',
    format: '$8$[salt]$[hash]',
  },
  {
    pattern: /^\$9\$[./0-9A-Za-z]{14}\$[./0-9A-Za-z]{43}$/,
    algorithm: 'cisco',
    label: 'Cisco tipo 9 ($9$)',
    description: 'scrypt usado em senhas "secret 9" do Cisco IOS.',
    securityLevel: 'strong',
    format: '$9$[salt]$[hash]',
  },
  {
    pattern:
      /^(?:pbkdf2_sha1|bcrypt_sha256|bcrypt|argon2|scrypt|sha1|md5|unsalted_md5|unsalted_sha1|crypt)\$/,
    algorithm: 'django',
    label: 'Django (outro hasher)',
    description: 'Formato "<algoritmo>$..." dos hashers de senha do Django.',
    securityLevel: 'moderate',
    format: '<algoritmo>$[parâmetros]$[salt]$[hash]',
  },
  {
    pattern: /^(?:pbkdf2:(?:sha1|sha256|sha512)(?::\d+)?|scrypt:\d+:\d+:\d+)\$[^$]+\$[a-f0-9]+$/,
    algorithm: 'werkzeug',
    label: 'Werkzeug / Flask',
    description: 'Formato de generate_password_hash do Werkzeug (Flask).',
    securityLevel: 'strong',
    format: 'pbkdf2:sha256:[iterations]$[salt]$[hash hex]',
  },
  {
    pattern: /^\{(?:SSHA512|SSHA256|SSHA|SHA512|SHA256|SHA|SMD5|MD5|CRYPT|PBKDF2(?:-SHA\d+)?|ARGON2)\}/i,
    algorithm: 'ldap',
    label: 'LDAP ({esquema})',
    description: 'Senha no formato userPassword do LDAP (OpenLDAP, 389-DS).',
    securityLevel: 'weak',
    format: '{ESQUEMA}[base64]',
  },
  {
    pattern: /^[a-f0-9]{16}$/i,
    algorithm: 'mysql323',
    label: 'MySQL 3.23 (OLD_PASSWORD)',
    description: 'Hash legado do MySQL anterior à 4.1. Também pode ser um CRC-64 ou meio LM.',
    securityLevel: 'insecure',
    format: '[16 caracteres hex]',
  },
];

function detectIdentifyOnly(hash: string): HashIdentification | null {
  const known = identifyOnlyFormats.find(({ pattern }) => pattern.test(hash));
  if (!known) {
    return null;
  }

  const { pattern: _pattern, ...rest } = known;
  return {
    ...rest,
    params: {},
    canGenerate: false,
    warnings: ['Formato identificado, mas a geração de um novo hash ainda não é suportada aqui.'],
  };
}

const hexDigests: Array<[number, HashAlgorithm]> = [
  [128, 'sha512'],
  [96, 'sha384'],
  [64, 'sha256'],
  [56, 'sha224'],
  [40, 'sha1'],
  [32, 'md5'],
];

function detectHexDigest(hash: string): HashIdentification | null {
  if (!/^[a-f0-9]+$/i.test(hash)) {
    return null;
  }
  const digest = hexDigests.find(([length]) => length === hash.length);
  return digest ? simpleDigest(digest[1], digest[0]) : null;
}

const detectors: Array<(value: string) => HashIdentification | null> = [
  detectBcrypt,
  detectArgon2,
  detectScrypt,
  detectPhpass,
  detectPbkdf2,
  detectDjangoPbkdf2,
  detectMysql41,
  detectIdentifyOnly,
  detectHexDigest,
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
