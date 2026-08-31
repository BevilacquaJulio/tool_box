import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const testConnectionSchema = z
  .object({
    host: z.string().trim().min(1, 'Informe o host').max(253),
    port: z.coerce.number().int().min(1).max(65535).default(3306),
    database: z
      .string()
      .trim()
      .min(1, 'Informe o nome do banco')
      .max(64)
      .regex(/^[A-Za-z0-9_$-]+$/, 'Nome do banco contem caracteres invalidos.'),
    username: z.string().trim().min(1, 'Informe o usuario').max(80),
    password: z.preprocess(
      (value) => (value === undefined || value === null ? '' : value),
      z.string().max(256),
    ),
  })
  .strict();

export class TestDbConnectionDto extends createZodDto(testConnectionSchema) {}
