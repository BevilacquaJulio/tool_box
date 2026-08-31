import { useMutation } from '@tanstack/react-query';
import { testDbConnection } from '../db-verify.api';
import type { DbVerifyInput } from '../db-verify.types';

export function useDbVerifyMutation() {
  return useMutation({
    mutationFn: (input: DbVerifyInput) => testDbConnection(input),
  });
}
