import { useMutation } from '@tanstack/react-query';
import { compareTexts, type DiffOptions, type DiffResult } from '../../../lib/text-diff';

export function useTextDiffMutation() {
  return useMutation<
    DiffResult,
    Error,
    {
      leftText: string;
      rightText: string;
      options: DiffOptions;
      leftLabel?: string;
      rightLabel?: string;
    }
  >({
    mutationFn: (input) =>
      Promise.resolve(
        compareTexts(input.leftText, input.rightText, input.options, input.leftLabel, input.rightLabel),
      ),
  });
}
