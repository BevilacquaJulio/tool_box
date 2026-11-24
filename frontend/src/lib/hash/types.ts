export type HashAlgorithm =
  | 'bcrypt'
  | 'argon2'
  | 'scrypt'
  | 'phpass'
  | 'pbkdf2-sha256'
  | 'pbkdf2-sha512'
  | 'django-pbkdf2-sha256'
  | 'md5'
  | 'sha1'
  | 'sha224'
  | 'sha256'
  | 'sha384'
  | 'sha512'
  | 'mysql41'
  // Formatos só identificados (sem geração).
  | 'md5-crypt'
  | 'sha256-crypt'
  | 'sha512-crypt'
  | 'yescrypt'
  | 'bcrypt-sha256'
  | 'pbkdf2-sha1'
  | 'drupal7'
  | 'django'
  | 'werkzeug'
  | 'ldap'
  | 'cisco'
  | 'mysql323'
  | 'unknown';

export type HashSecurityLevel = 'strong' | 'moderate' | 'weak' | 'insecure';

export type HashParams = {
  variant?: string;
  cost?: number;
  memoryCost?: number;
  timeCost?: number;
  parallelism?: number;
  iterations?: number;
  saltLength?: number;
  hashLength?: number;
  logN?: number;
  blockSize?: number;
  djangoIterations?: number;
};

export type HashIdentification = {
  algorithm: HashAlgorithm;
  label: string;
  description: string;
  securityLevel: HashSecurityLevel;
  params: HashParams;
  format: string;
  canGenerate: boolean;
  warnings: string[];
};

export type GenerateHashResult = {
  hash: string;
  algorithm: HashAlgorithm;
  label: string;
  params: HashParams;
  warnings: string[];
};

export class HashError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HashError';
  }
}
