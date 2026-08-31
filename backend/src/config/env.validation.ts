import { z } from 'zod';

const corsOriginSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.split(',').every((origin) => {
        try {
          new URL(origin.trim());
          return origin.trim().length > 0;
        } catch {
          return false;
        }
      }),
    'CORS_ORIGIN must be a comma-separated list of absolute origins',
  );

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  CORS_ORIGIN: corsOriginSchema,
  INTERNAL_API_KEY: z.string().min(32),
  DB_VERIFY_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().max(60_000).default(10_000),
  DB_VERIFY_QUERY_TIMEOUT_MS: z.coerce.number().int().positive().max(60_000).default(8_000),
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(20),
  JSON_BODY_LIMIT: z.string().min(2).max(16).default('32kb'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  return envSchema.parse(config);
}

export function parseCorsOrigins(corsOrigin: string): string[] {
  return corsOrigin.split(',').map((value) => value.trim());
}
