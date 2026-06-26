import { useMutation, useQueryClient } from '@tanstack/react-query';
import { irApi } from '../api/irApi';
import { setSelectedDataset } from './useDatasetSelection';

export function useCorpusUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { dataset_id: string; name: string; documents_file: File; queries_file: File }) => irApi.uploadCorpus(payload),
    onSuccess: (result) => {
      setSelectedDataset(result.dataset_id);
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['corpus-overview', result.dataset_id] });
      queryClient.invalidateQueries({ queryKey: ['dataset-quality', result.dataset_id] });
    },
  });
}
