import { useQuery } from '@tanstack/react-query';
import { irApi } from '../api/irApi';

export function useDatasets() {
  return useQuery({ queryKey: ['datasets'], queryFn: irApi.datasets });
}

export function useDatasetQuality(datasetId: string) {
  return useQuery({ queryKey: ['dataset-quality', datasetId], queryFn: () => irApi.datasetQuality(datasetId) });
}

export function useDatasetImports(datasetId: string) {
  return useQuery({ queryKey: ['dataset-imports', datasetId], queryFn: () => irApi.datasetImports(datasetId) });
}

export function useCorpusOverview(datasetId: string) {
  return useQuery({ queryKey: ['corpus-overview', datasetId], queryFn: () => irApi.corpusOverview(datasetId) });
}

export function useDocuments(datasetId: string) {
  return useQuery({ queryKey: ['documents', datasetId], queryFn: () => irApi.documents(datasetId) });
}

export function useQueries(datasetId: string) {
  return useQuery({ queryKey: ['queries', datasetId], queryFn: () => irApi.queries(datasetId) });
}
