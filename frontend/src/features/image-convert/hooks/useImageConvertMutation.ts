import { useMutation } from '@tanstack/react-query';
import { convertImages } from '../../../lib/image-convert';
import type { ConvertImagesInput, ConvertImagesResult } from '../../../lib/image-convert';

export function useConvertImageMutation() {
  return useMutation<ConvertImagesResult, Error, ConvertImagesInput>({
    mutationFn: (input) => convertImages(input),
  });
}
