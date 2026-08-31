import { useMutation } from '@tanstack/react-query';
import { processJsonInput, type DataFormat, type JsonFormatterAction, type JsonFormatterResult } from '../../../lib/json-formatter';

export function useJsonFormatterMutation() {
  return useMutation<
    JsonFormatterResult,
    Error,
    {
      text: string;
      inputFormat: DataFormat | 'auto';
      action: JsonFormatterAction;
      outputFormat?: DataFormat;
    }
  >({
    mutationFn: (input) => Promise.resolve(processJsonInput(input)),
  });
}
