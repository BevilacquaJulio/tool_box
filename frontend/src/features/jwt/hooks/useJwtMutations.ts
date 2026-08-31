import { useMutation } from '@tanstack/react-query';
import { generateRandomJwt } from '../../../lib/jwt';
import type { GenerateRandomJwtInput, GenerateRandomJwtResult } from '../../../lib/jwt';

export function useGenerateRandomJwtMutation() {
  return useMutation<GenerateRandomJwtResult, Error, GenerateRandomJwtInput>({
    mutationFn: (input) => generateRandomJwt(input),
  });
}
