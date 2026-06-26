import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { irApi } from '../api/irApi';

export function useTextMiningSummary(datasetId: string, runId?: string) {
  return useQuery({ queryKey: ['text-mining-summary', datasetId, runId], queryFn: () => irApi.textMiningSummary(datasetId, runId) });
}

export function useTextTerms(datasetId: string, runId?: string) {
  return useQuery({ queryKey: ['text-terms', datasetId, runId], queryFn: () => irApi.textTerms(datasetId, runId) });
}

export function useTextNetwork(datasetId: string, runId?: string) {
  return useQuery({ queryKey: ['text-network', datasetId, runId], queryFn: () => irApi.textNetwork(datasetId, runId) });
}

export function useTextCooccurrence(datasetId: string, runId?: string) {
  return useQuery({ queryKey: ['text-cooccurrence', datasetId, runId], queryFn: () => irApi.textCooccurrence(datasetId, runId) });
}

export function useTextCollocations(datasetId: string, runId?: string) {
  return useQuery({ queryKey: ['text-collocations', datasetId, runId], queryFn: () => irApi.textCollocations(datasetId, runId) });
}

export function useTextAssociationRules(datasetId: string, runId?: string) {
  return useQuery({ queryKey: ['text-rules', datasetId, runId], queryFn: () => irApi.textAssociationRules(datasetId, runId) });
}

export function useTextSankey(datasetId: string, runId?: string) {
  return useQuery({ queryKey: ['text-sankey', datasetId, runId], queryFn: () => irApi.textSankey(datasetId, runId) });
}

export function useRunTextMining(datasetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => irApi.runTextMining({ dataset_id: datasetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['text-mining-summary', datasetId] });
      queryClient.invalidateQueries({ queryKey: ['text-terms', datasetId] });
      queryClient.invalidateQueries({ queryKey: ['text-network', datasetId] });
      queryClient.invalidateQueries({ queryKey: ['text-cooccurrence', datasetId] });
      queryClient.invalidateQueries({ queryKey: ['text-collocations', datasetId] });
      queryClient.invalidateQueries({ queryKey: ['text-rules', datasetId] });
      queryClient.invalidateQueries({ queryKey: ['text-sankey', datasetId] });
    },
  });
}
