import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { irApi } from '../api/irApi';

export function useJobs() {
  return useQuery({ queryKey: ['jobs'], queryFn: irApi.jobs, refetchInterval: 1500 });
}

export function useJobLogs(jobId?: string) {
  return useQuery({ queryKey: ['job-logs', jobId], queryFn: () => irApi.jobLogs(jobId!), enabled: Boolean(jobId), refetchInterval: 1500 });
}

export function useCancelJob() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: irApi.cancelJob, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }) });
}

export function useRetryJob() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: irApi.retryJob, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }) });
}
