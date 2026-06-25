import { useQuery } from '@tanstack/react-query';
import { irApi } from '../api/irApi';

export function useAnalyticsOverview(datasetId: string) {
  return useQuery({ queryKey: ['analytics-overview', datasetId], queryFn: () => irApi.analyticsOverview(datasetId) });
}

export function useAnalyticsQueryMetrics(datasetId: string, experimentId?: string) {
  return useQuery({ queryKey: ['analytics-query-metrics', datasetId, experimentId], queryFn: () => irApi.analyticsQueryMetrics(datasetId, experimentId) });
}

export function useDatasetProfile(datasetId: string) {
  return useQuery({ queryKey: ['dataset-profile', datasetId], queryFn: () => irApi.datasetProfile(datasetId) });
}
