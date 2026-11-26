import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const MEDIA_EXTRACT_MODES = ['all', 'audio'] as const;
export type MediaExtractMode = (typeof MEDIA_EXTRACT_MODES)[number];

export const analyzeMediaSchema = z
  .object({
    url: z.string().trim().min(1, 'Informe uma URL válida.').max(2048, 'URL muito longa.'),
    mode: z.enum(MEDIA_EXTRACT_MODES).default('all'),
  })
  .strict();

export class AnalyzeMediaDto extends createZodDto(analyzeMediaSchema) {}
