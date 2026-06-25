import { useMutation } from '@tanstack/react-query';
import { irApi } from '../api/irApi';
import { getSelectedDataset } from './useDatasetSelection';

export function useRagEvaluation() {
  return useMutation({ mutationFn: (query: string) => irApi.ragAnswer(query, getSelectedDataset()) });
}
