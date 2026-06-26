import { useMutation, useQuery } from '@tanstack/react-query';
import { irApi } from '../api/irApi';
import type { RetrievalMode } from '../api/types';

export function useLlmStatus() {
  return useQuery({ queryKey: ['llm-status'], queryFn: irApi.llmStatus, refetchInterval: 30000 });
}

export function useLlmDashboard(datasetId: string) {
  return useQuery({ queryKey: ['llm-dashboard', datasetId], queryFn: () => irApi.llmDashboard(datasetId), refetchInterval: 30000 });
}

export function useLlmRuns(datasetId: string) {
  return useQuery({ queryKey: ['llm-runs', datasetId], queryFn: () => irApi.llmRuns(datasetId), refetchInterval: 30000 });
}

export function useBadCaseSuggestion() {
  return useMutation({ mutationFn: (caseId: string) => irApi.badCaseSuggestion(caseId) });
}

export function useAcceptBadCaseSuggestion() {
  return useMutation({ mutationFn: (caseId: string) => irApi.acceptBadCaseSuggestion(caseId) });
}

export function useRejectBadCaseSuggestion() {
  return useMutation({ mutationFn: (caseId: string) => irApi.rejectBadCaseSuggestion(caseId) });
}

export function useQueryRewrite() {
  return useMutation({
    mutationFn: (payload: { dataset_id: string; query?: string; query_id?: string; mode: RetrievalMode; k: number; alpha: number; require_real_llm?: boolean }) => irApi.queryRewrite(payload),
  });
}

export function useQueryRewriteExperiment() {
  return useMutation({
    mutationFn: (payload: { dataset_id: string; query_ids?: string[]; limit: number; mode: RetrievalMode; k: number; alpha: number; require_real_llm?: boolean }) => irApi.queryRewriteExperiment(payload),
  });
}

export function useExperimentNarrative(datasetId: string) {
  return useQuery({ queryKey: ['llm-narrative', datasetId], queryFn: () => irApi.experimentNarrative(datasetId) });
}
