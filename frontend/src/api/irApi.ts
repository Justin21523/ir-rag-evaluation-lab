import { apiClient } from './client';
import type { AnalyticsOverview, BadCase, CompareExperiment, DatasetImport, DatasetProfile, DatasetQualityCheck, DatasetRecord, DocumentRecord, Experiment, JobLog, JobRecord, QueryMetricRow, QueryRecord, RagClaim, RetrievalMode, SearchResponse } from './types';

export const irApi = {
  async datasets() {
    const { data } = await apiClient.get('/corpus/datasets');
    return data as DatasetRecord[];
  },
  async datasetQuality(datasetId: string) {
    const { data } = await apiClient.get(`/corpus/datasets/${datasetId}/quality`);
    return data as DatasetQualityCheck[];
  },
  async datasetImports(datasetId: string) {
    const { data } = await apiClient.get(`/corpus/datasets/${datasetId}/imports`);
    return data as DatasetImport[];
  },
  async jobs() {
    const { data } = await apiClient.get('/jobs');
    return data as JobRecord[];
  },
  async job(jobId: string) {
    const { data } = await apiClient.get(`/jobs/${jobId}`);
    return data as JobRecord;
  },
  async jobLogs(jobId: string) {
    const { data } = await apiClient.get(`/jobs/${jobId}/logs`);
    return data as JobLog[];
  },
  async cancelJob(jobId: string) {
    const { data } = await apiClient.post(`/jobs/${jobId}/cancel`);
    return data as JobRecord;
  },
  async retryJob(jobId: string) {
    const { data } = await apiClient.post(`/jobs/${jobId}/retry`);
    return data as JobRecord;
  },
  async importJob(payload: Record<string, unknown>) {
    const { data } = await apiClient.post('/corpus/datasets/import-job', payload);
    return data as JobRecord;
  },
  async corpusOverview(datasetId = 'sample_default') {
    const { data } = await apiClient.get(`/corpus/overview?dataset_id=${encodeURIComponent(datasetId)}`);
    return data as {
      dataset_id: string;
      dataset: DatasetRecord | null;
      document_count: number;
      query_count: number;
      qrels_count: number;
      available_retrievers: string[];
      metadata_distribution: Record<string, number>;
    };
  },
  async documents(datasetId = 'sample_default') {
    const { data } = await apiClient.get(`/corpus/documents?dataset_id=${encodeURIComponent(datasetId)}`);
    return data as DocumentRecord[];
  },
  async queries(datasetId = 'sample_default') {
    const { data } = await apiClient.get(`/corpus/queries?dataset_id=${encodeURIComponent(datasetId)}`);
    return data as QueryRecord[];
  },
  async search(query: string, mode: RetrievalMode, k: number, alpha: number, datasetId = 'sample_default') {
    const { data } = await apiClient.post('/search', { dataset_id: datasetId, query, mode, k, alpha });
    return data as SearchResponse;
  },
  async evaluate(retriever_name: RetrievalMode, datasetId = 'sample_default') {
    const { data } = await apiClient.post('/evaluate', { dataset_id: datasetId, retriever_name, k_values: [1, 3, 5, 10] });
    return data as { experiment_id: string; metrics: Record<string, number> };
  },
  async runBatch(payload: { dataset_id: string; retrievers: RetrievalMode[]; k_values: number[]; alpha: number; dense_backend: string }) {
    const { data } = await apiClient.post('/experiments/run-batch', payload);
    return data as JobRecord;
  },
  async experiments() {
    const { data } = await apiClient.get('/experiments');
    return data as Experiment[];
  },
  async compare(ids: string[]) {
    const { data } = await apiClient.get(`/experiments/compare?ids=${ids.join(',')}`);
    return data as CompareExperiment[];
  },
  async badCases() {
    const { data } = await apiClient.get('/bad-cases');
    return data as BadCase[];
  },
  async updateBadCase(caseId: string, payload: { notes?: string; reviewer_label?: string }) {
    const { data } = await apiClient.patch(`/bad-cases/${caseId}`, payload);
    return data as BadCase;
  },
  badCasesCsvUrl() {
    return '/api/v1/bad-cases/export.csv';
  },
  async ragAnswer(query: string, datasetId = 'sample_default') {
    const { data } = await apiClient.post('/rag/answer', { dataset_id: datasetId, query, mode: 'hybrid', k: 5, alpha: 0.5 });
    return data as {
      answer_text: string;
      cited_doc_ids: string[];
      evidence: Array<{ doc_id: string; title: string; snippet: string }>;
      metrics: Record<string, number | string[]>;
      claims: RagClaim[];
      faithfulness_checklist: Array<{ id: string; passed: boolean; label: string }>;
    };
  },
  async metricsDefinitions() {
    const { data } = await apiClient.get('/metrics/definitions');
    return data as Record<string, string>;
  },
  async analyticsOverview(datasetId = 'sample_default') {
    const { data } = await apiClient.get(`/analytics/overview?dataset_id=${encodeURIComponent(datasetId)}`);
    return data as AnalyticsOverview;
  },
  async analyticsQueryMetrics(datasetId = 'sample_default', experimentId?: string) {
    const suffix = experimentId ? `&experiment_id=${encodeURIComponent(experimentId)}` : '';
    const { data } = await apiClient.get(`/analytics/query-metrics?dataset_id=${encodeURIComponent(datasetId)}${suffix}`);
    return data as QueryMetricRow[];
  },
  async datasetProfile(datasetId = 'sample_default') {
    const { data } = await apiClient.get(`/analytics/dataset-profile?dataset_id=${encodeURIComponent(datasetId)}`);
    return data as DatasetProfile;
  },
};
