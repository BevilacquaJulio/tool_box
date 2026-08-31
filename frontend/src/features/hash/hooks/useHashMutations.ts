import { useMutation } from '@tanstack/react-query';
import { generateHash, identifyHash } from '../../../lib/hash';
import type { GenerateHashResult, HashIdentification } from '../../../lib/hash';

export function useIdentifyHashMutation() {
  return useMutation<HashIdentification, Error, string>({
    mutationFn: (hash) => Promise.resolve(identifyHash(hash)),
  });
}

export function useGenerateHashMutation() {
  return useMutation<
    GenerateHashResult,
    Error,
    { password: string; referenceHash: string }
  >({
    mutationFn: ({ password, referenceHash }) => generateHash(password, referenceHash),
  });
}
