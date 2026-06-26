import { useQuery } from '@tanstack/react-query';
import { irApi } from '../api/irApi';

export function useAnalyticsOverview(datasetId: string, suiteId?: string) {
  return useQuery({ queryKey: ['analytics-overview', datasetId, suiteId], queryFn: () => irApi.analyticsOverview(datasetId, suiteId) });
}

export function useAnalyticsQueryMetrics(datasetId: string, experimentId?: string, suiteId?: string) {
  return useQuery({ queryKey: ['analytics-query-metrics', datasetId, experimentId, suiteId], queryFn: () => irApi.analyticsQueryMetrics(datasetId, experimentId, suiteId) });
}

export function useDatasetProfile(datasetId: string) {
  return useQuery({ queryKey: ['dataset-profile', datasetId], queryFn: () => irApi.datasetProfile(datasetId) });
}

export function useQueryDiagnostics(datasetId: string, queryId: string | null, experimentIds: string[] = [], k = 10) {
  return useQuery({
    queryKey: ['query-diagnostics', datasetId, queryId, experimentIds, k],
    queryFn: () => irApi.queryDiagnostics(datasetId, queryId || '', experimentIds, k),
    enabled: Boolean(queryId),
  });
}

export function usePairwiseComparison(datasetId: string, leftExperimentId?: string, rightExperimentId?: string, k = 10) {
  return useQuery({
    queryKey: ['pairwise', datasetId, leftExperimentId, rightExperimentId, k],
    queryFn: () => irApi.pairwise(datasetId, leftExperimentId || '', rightExperimentId || '', k),
    enabled: Boolean(leftExperimentId && rightExperimentId),
  });
}

export function useCorrelations(datasetId: string, k = 10, suiteId?: string) {
  return useQuery({ queryKey: ['correlations', datasetId, k, suiteId], queryFn: () => irApi.correlations(datasetId, k, suiteId) });
}

export function useInsights(datasetId: string, suiteId?: string) {
  return useQuery({ queryKey: ['insights', datasetId, suiteId], queryFn: () => irApi.insights(datasetId, suiteId) });
}

export function useMetricMatrix(datasetId: string, suiteId?: string) {
  return useQuery({ queryKey: ['metric-matrix', datasetId, suiteId], queryFn: () => irApi.metricMatrix(datasetId, suiteId) });
}

export function useFailureHeatmap(datasetId: string, suiteId?: string, k = 10) {
  return useQuery({ queryKey: ['failure-heatmap', datasetId, suiteId, k], queryFn: () => irApi.failureHeatmap(datasetId, suiteId, k) });
}

export function useRankMovement(datasetId: string, suiteId?: string, queryId?: string, k = 10) {
  return useQuery({ queryKey: ['rank-movement', datasetId, suiteId, queryId, k], queryFn: () => irApi.rankMovement(datasetId, suiteId, queryId, k) });
}

export function useRetrieverBattle(datasetId: string, suiteId?: string, k = 10) {
  return useQuery({ queryKey: ['retriever-battle', datasetId, suiteId, k], queryFn: () => irApi.retrieverBattle(datasetId, suiteId, k) });
}
