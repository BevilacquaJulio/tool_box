import { apiRequest } from '../../lib/api';
import type { AnalyzeMediaRequest, MediaExtractResult } from './media-extract.types';

export function analyzeMediaUrl(payload: AnalyzeMediaRequest): Promise<MediaExtractResult> {
  return apiRequest<MediaExtractResult>('/media-extract/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
