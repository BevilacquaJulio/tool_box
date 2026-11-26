import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const analyzeMediaSchema = z
  .object({
    url: z.string().trim().min(1, 'Informe uma URL válida.').max(2048, 'URL muito longa.'),
  })
  .strict();

export class AnalyzeMediaDto extends createZodDto(analyzeMediaSchema) {}
