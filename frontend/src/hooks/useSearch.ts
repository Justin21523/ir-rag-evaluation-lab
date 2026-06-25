import { useMutation } from '@tanstack/react-query';
import { irApi } from '../api/irApi';
import type { RetrievalMode } from '../api/types';
import { getSelectedDataset } from './useDatasetSelection';

export function useSearch() {
  return useMutation({
    mutationFn: (payload: { query: string; mode: RetrievalMode; k: number; alpha: number }) =>
      irApi.search(payload.query, payload.mode, payload.k, payload.alpha, getSelectedDataset()),
  });
}
