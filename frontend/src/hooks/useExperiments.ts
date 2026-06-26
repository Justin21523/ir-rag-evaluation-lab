import { useMutation, useQuery } from '@tanstack/react-query';
import { irApi } from '../api/irApi';
import type { RetrievalMode } from '../api/types';
import { getSelectedDataset } from './useDatasetSelection';

export function useExperiments() {
  return useQuery({ queryKey: ['experiments'], queryFn: irApi.experiments });
}

export function useEvaluationSuites(datasetId?: string) {
  return useQuery({ queryKey: ['evaluation-suites', datasetId], queryFn: () => irApi.evaluationSuites(datasetId) });
}

export function useEvaluate() {
  return useMutation({ mutationFn: (mode: RetrievalMode) => irApi.evaluate(mode, getSelectedDataset()) });
}
