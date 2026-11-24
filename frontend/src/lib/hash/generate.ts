import { md5 } from '@noble/hashes/legacy.js';
import bcrypt from 'bcryptjs';
import { argon2d, argon2i, argon2id, md5 as md5Hex, scrypt, sha1, sha224 } from 'hash-wasm';
import type { GenerateHashResult, HashIdentification, HashParams } from './types';
import { HashError } from './types';
import { identifyHash } from './identify';

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function trimBase64(value: string): string {
  return value.replace(/=+$/, '');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return trimBase64(btoa(binary));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function pbkdf2Derive(
  password: string,
  salt: Uint8Array,
  iterations: number,
  keyLen: number,
  hash: 'SHA-256' | 'SHA-512',
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new Uint8Array(salt), iterations, hash },
    key,
    keyLen * 8,
  );
  return new Uint8Array(bits);
}

async function digestHex(
  algorithm: 'MD5' | 'SHA-1' | 'SHA-224' | 'SHA-256' | 'SHA-384' | 'SHA-512',
  password: string,
) {
  // Web Crypto não tem MD5 nem SHA-224.
  if (algorithm === 'MD5') {
    return md5Hex(password);
  }
  if (algorithm === 'SHA-224') {
    return sha224(password);
  }

  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest(algorithm, enc.encode(password));
  return bytesToHex(new Uint8Array(hash));
}

function phpassCostChar(cost: number): string {
  const alphabet = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  return alphabet[Math.min(Math.max(cost, 0), alphabet.length - 1)];
}

function randomPhpassSalt(length: number): string {
  const alphabet = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = randomBytes(length);
  let salt = '';
  for (let i = 0; i < length; i++) {
    salt += alphabet[bytes[i] % alphabet.length];
  }
  return salt;
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

// Porta literal do encode64 do phpass (PasswordHash.php).
function encode64(input: Uint8Array, count: number): string {
  const itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let output = '';
  let i = 0;

  do {
    let value = input[i++];
    output += itoa64[value & 0x3f];
    if (i < count) {
      value |= input[i] << 8;
    }
    output += itoa64[(value >> 6) & 0x3f];
    if (i++ >= count) {
      break;
    }
    if (i < count) {
      value |= input[i] << 16;
    }
    output += itoa64[(value >> 12) & 0x3f];
    if (i++ >= count) {
      break;
    }
    output += itoa64[(value >> 18) & 0x3f];
  } while (i < count);

  return output;
}

// O MD5 é encadeado em bytes crus; converter para string reencodaria bytes >= 0x80 em UTF-8.
export function phpassPortableHash(password: string, salt: string, countLog2: number): string {
  const enc = new TextEncoder();
  const pw = enc.encode(password);
  let hash = md5(concatBytes(enc.encode(salt), pw));
  let count = 1 << countLog2;

  do {
    hash = md5(concatBytes(hash, pw));
  } while (--count);

  return encode64(hash, 16);
}

async function generateBcrypt(
  password: string,
  identification: HashIdentification,
  params: HashParams,
): Promise<GenerateHashResult> {
  const cost = params.cost ?? 10;
  const variant = params.variant ?? '$2a$';

  let hash = await bcrypt.hash(password, cost);

  if (variant === '$2y$') {
    hash = hash.replace(/^\$2[aby]\$/, '$2y$');
  } else if (variant === '$2b$') {
    hash = hash.replace(/^\$2[ay]\$/, '$2b$');
  } else if (variant === '$2x$') {
    hash = hash.replace(/^\$2[aby]\$/, '$2x$');
  }

  return {
    hash,
    algorithm: 'bcrypt',
    label: identification.label,
    params: { variant, cost },
    warnings: identification.warnings,
  };
}

async function generateArgon2(
  password: string,
  identification: HashIdentification,
  params: HashParams,
): Promise<GenerateHashResult> {
  const variant = params.variant ?? 'id';
  const fn = variant === 'd' ? argon2d : variant === 'i' ? argon2i : argon2id;

  const hash = await fn({
    password,
    salt: randomBytes(16),
    parallelism: params.parallelism ?? 1,
    iterations: params.timeCost ?? 3,
    memorySize: params.memoryCost ?? 65536,
    hashLength: 32,
    outputType: 'encoded',
  });

  return {
    hash,
    algorithm: 'argon2',
    label: identification.label,
    params: {
      variant,
      memoryCost: params.memoryCost ?? 65536,
      timeCost: params.timeCost ?? 3,
      parallelism: params.parallelism ?? 1,
    },
    warnings: identification.warnings,
  };
}

async function generateScrypt(
  password: string,
  identification: HashIdentification,
  params: HashParams,
): Promise<GenerateHashResult> {
  const logN = params.logN ?? 14;
  const blockSize = params.blockSize ?? 8;
  const parallelism = params.parallelism ?? 1;
  const salt = randomBytes(16);
  const derivedHex = await scrypt({
    password,
    salt: bytesToHex(salt),
    costFactor: logN,
    blockSize,
    parallelism,
    hashLength: 32,
    outputType: 'hex',
  });
  const derived = new Uint8Array(derivedHex.match(/.{2}/g)!.map((h) => Number.parseInt(h, 16)));
  const hash = `$scrypt$ln=${logN},r=${blockSize},p=${parallelism}$${bytesToBase64(salt)}$${bytesToBase64(derived)}`;

  return {
    hash,
    algorithm: 'scrypt',
    label: identification.label,
    params: { logN, blockSize, parallelism },
    warnings: identification.warnings,
  };
}

async function generatePhpass(
  password: string,
  identification: HashIdentification,
  params: HashParams,
): Promise<GenerateHashResult> {
  // $P$ (WordPress) e $H$ (phpBB3) são o mesmo algoritmo; só o prefixo muda.
  const type = params.variant === 'H' ? 'H' : 'P';
  const cost = params.cost ?? 8;
  const salt = randomPhpassSalt(8);
  const portable = phpassPortableHash(password, salt, cost);

  return {
    hash: `$${type}$${phpassCostChar(cost)}${salt}${portable}`,
    algorithm: 'phpass',
    label: identification.label,
    params: { variant: type, cost },
    warnings: identification.warnings,
  };
}

async function generatePbkdf2(
  password: string,
  identification: HashIdentification,
  params: HashParams,
  digest: 'SHA-256' | 'SHA-512',
): Promise<GenerateHashResult> {
  const iterations = params.iterations ?? 100_000;
  const salt = randomBytes(16);
  const keyLen = digest === 'SHA-512' ? 64 : 32;
  const derived = await pbkdf2Derive(password, salt, iterations, keyLen, digest);
  const prefix = digest === 'SHA-512' ? 'pbkdf2-sha512' : 'pbkdf2-sha256';

  return {
    hash: `$${prefix}$${iterations}$${bytesToBase64(salt)}$${bytesToBase64(derived)}`,
    algorithm: digest === 'SHA-512' ? 'pbkdf2-sha512' : 'pbkdf2-sha256',
    label: identification.label,
    params: { iterations },
    warnings: identification.warnings,
  };
}

async function generateDjangoPbkdf2(
  password: string,
  identification: HashIdentification,
  params: HashParams,
): Promise<GenerateHashResult> {
  const iterations = params.djangoIterations ?? 600_000;
  const saltBytes = randomBytes(16);
  const salt = bytesToBase64(saltBytes);
  const derived = await pbkdf2Derive(password, saltBytes, iterations, 32, 'SHA-256');
  const hash = bytesToBase64(derived);

  return {
    hash: `pbkdf2_sha256$${iterations}$${salt}$${hash}`,
    algorithm: 'django-pbkdf2-sha256',
    label: identification.label,
    params: { djangoIterations: iterations },
    warnings: identification.warnings,
  };
}

async function generateDigest(
  password: string,
  identification: HashIdentification,
): Promise<GenerateHashResult> {
  const algoMap = {
    md5: 'MD5',
    sha1: 'SHA-1',
    sha224: 'SHA-224',
    sha256: 'SHA-256',
    sha384: 'SHA-384',
    sha512: 'SHA-512',
  } as const;

  const algo = identification.algorithm as keyof typeof algoMap;
  const hash = await digestHex(algoMap[algo], password);

  return {
    hash,
    algorithm: identification.algorithm,
    label: identification.label,
    params: identification.params,
    warnings: identification.warnings,
  };
}

async function generateMysql41(
  password: string,
  identification: HashIdentification,
): Promise<GenerateHashResult> {
  // mysql_native_password: "*" + SHA1(SHA1(senha) em bytes), em hex maiúsculo.
  const inner = await sha1(password);
  const outer = await sha1(new Uint8Array(inner.match(/.{2}/g)!.map((h) => Number.parseInt(h, 16))));

  return {
    hash: `*${outer.toUpperCase()}`,
    algorithm: 'mysql41',
    label: identification.label,
    params: {},
    warnings: identification.warnings,
  };
}

export async function generateHash(
  password: string,
  referenceHash: string,
  overrideParams?: HashParams,
): Promise<GenerateHashResult> {
  if (!referenceHash.trim()) {
    throw new HashError('Informe um hash de referência para detectar o algoritmo e os parâmetros.');
  }

  const identification = identifyHash(referenceHash);

  if (!identification.canGenerate) {
    throw new HashError(`Não é possível gerar hash para o algoritmo "${identification.label}".`);
  }

  const params = { ...identification.params, ...overrideParams };

  switch (identification.algorithm) {
    case 'bcrypt':
      return generateBcrypt(password, identification, params);
    case 'argon2':
      return generateArgon2(password, identification, params);
    case 'scrypt':
      return generateScrypt(password, identification, params);
    case 'phpass':
      return generatePhpass(password, identification, params);
    case 'pbkdf2-sha256':
      return generatePbkdf2(password, identification, params, 'SHA-256');
    case 'pbkdf2-sha512':
      return generatePbkdf2(password, identification, params, 'SHA-512');
    case 'django-pbkdf2-sha256':
      return generateDjangoPbkdf2(password, identification, params);
    case 'mysql41':
      return generateMysql41(password, identification);
    case 'md5':
    case 'sha1':
    case 'sha224':
    case 'sha256':
    case 'sha384':
    case 'sha512':
      return generateDigest(password, identification);
    default:
      throw new HashError('Algoritmo não suportado para geração.');
  }
}
