import { useMutation } from '@tanstack/react-query';
import { convertDocuments } from '../../../lib/document-convert';
import type { ConvertDocumentsInput, ConvertDocumentsResult } from '../../../lib/document-convert';

export function useConvertDocumentsMutation() {
  return useMutation<ConvertDocumentsResult, Error, ConvertDocumentsInput>({
    mutationFn: (input) => convertDocuments(input),
  });
}
