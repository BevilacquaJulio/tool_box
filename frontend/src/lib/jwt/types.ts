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

export type GenerateRandomJwtInput = {
  algorithm: HmacAlgorithm;
};

export type GenerateRandomJwtResult = {
  token: string;
  secret: string;
  algorithm: HmacAlgorithm;
};
