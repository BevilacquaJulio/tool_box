export const HMAC_ALGORITHMS = ['HS256', 'HS384', 'HS512'] as const;

export type HmacAlgorithm = (typeof HMAC_ALGORITHMS)[number];

export type JwtWeight = {
  algorithm: HmacAlgorithm;
  label: string;
  description: string;
};

export const JWT_WEIGHTS: JwtWeight[] = [
  {
    algorithm: 'HS256',
    label: 'Leve',
    description: 'HS256, hash de 256 bits',
  },
  {
    algorithm: 'HS384',
    label: 'Médio',
    description: 'HS384, hash de 384 bits',
  },
  {
    algorithm: 'HS512',
    label: 'Forte',
    description: 'HS512, hash de 512 bits',
  },
];

// RFC 7518 §3.2: a chave HMAC precisa ter pelo menos o tamanho do hash. O segredo é ASCII, então 1 caractere = 1 byte.
export const MIN_SECRET_LENGTH: Record<HmacAlgorithm, number> = {
  HS256: 32,
  HS384: 48,
  HS512: 64,
};

export const MAX_SECRET_LENGTH = 512;

// Padrão: caracteres suficientes para a entropia igualar o tamanho do hash (6 bits por caractere).
export const DEFAULT_SECRET_LENGTH: Record<HmacAlgorithm, number> = {
  HS256: 43,
  HS384: 64,
  HS512: 86,
};

export type GenerateRandomJwtInput = {
  algorithm: HmacAlgorithm;
  /** Quantidade de caracteres do segredo. Padrão: DEFAULT_SECRET_LENGTH do algoritmo. */
  secretLength?: number;
};

export type GenerateRandomJwtResult = {
  token: string;
  secret: string;
  algorithm: HmacAlgorithm;
};
