import { useMutation } from '@tanstack/react-query';
import { analyzeMediaUrl } from '../media-extract.api';
import type { AnalyzeMediaRequest } from '../media-extract.types';

export function useAnalyzeMediaUrlMutation() {
  return useMutation({
    mutationFn: (payload: AnalyzeMediaRequest) => analyzeMediaUrl(payload),
  });
}
