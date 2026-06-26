import { apiClient } from './client';
import type { AnalyticsOverview, BadCase, BadCaseSuggestion, CompareExperiment, CorrelationData, CorpusUploadResult, DatasetImport, DatasetProfile, DatasetQualityCheck, DatasetRecord, DocumentRecord, EvaluationSuite, Experiment, ExperimentNarrative, FailureHeatmap, InsightSummary, JobLog, JobRecord, LlmDashboard, LlmFaithfulness, LlmRunRecord, LlmStatus, MetricMatrix, PairwiseComparison, QueryDiagnostics, QueryMetricRow, QueryRecord, QueryRewriteExperiment, QueryRewriteSandbox, RagClaim, RankMovement, RetrievalMode, RetrieverBattle, SearchResponse, TextAssociationRules, TextCollocations, TextCooccurrence, TextMiningSummary, TextNetwork, TextSankey, TextTerms } from './types';

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
  async uploadCorpus(payload: { dataset_id: string; name: string; documents_file: File; queries_file: File }) {
    const form = new FormData();
    form.append('dataset_id', payload.dataset_id);
    form.append('name', payload.name);
    form.append('documents_file', payload.documents_file);
    form.append('queries_file', payload.queries_file);
    const { data } = await apiClient.post('/corpus/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data as CorpusUploadResult;
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
  async evaluationSuites(datasetId?: string) {
    const suffix = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : '';
    const { data } = await apiClient.get(`/evaluation-suites${suffix}`);
    return data as EvaluationSuite[];
  },
  async compare(ids: string[]) {
    const { data } = await apiClient.get(`/experiments/compare?ids=${ids.join(',')}`);
    return data as CompareExperiment[];
  },
  async badCases() {
    const { data } = await apiClient.get('/bad-cases');
    return data as BadCase[];
  },
  async updateBadCase(caseId: string, payload: { notes?: string; reviewer_label?: string; root_cause?: string; severity?: string; owner?: string; review_status?: string }) {
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
      llm_faithfulness: LlmFaithfulness;
      faithfulness_checklist: Array<{ id: string; passed: boolean; label: string }>;
    };
  },
  async metricsDefinitions() {
    const { data } = await apiClient.get('/metrics/definitions');
    return data as Record<string, string>;
  },
  async analyticsOverview(datasetId = 'sample_default', suiteId?: string) {
    const suite = suiteId ? `&suite_id=${encodeURIComponent(suiteId)}` : '';
    const { data } = await apiClient.get(`/analytics/overview?dataset_id=${encodeURIComponent(datasetId)}${suite}`);
    return data as AnalyticsOverview;
  },
  async analyticsQueryMetrics(datasetId = 'sample_default', experimentId?: string, suiteId?: string) {
    const suffix = experimentId ? `&experiment_id=${encodeURIComponent(experimentId)}` : '';
    const suite = suiteId ? `&suite_id=${encodeURIComponent(suiteId)}` : '';
    const { data } = await apiClient.get(`/analytics/query-metrics?dataset_id=${encodeURIComponent(datasetId)}${suffix}${suite}`);
    return data as QueryMetricRow[];
  },
  async datasetProfile(datasetId = 'sample_default') {
    const { data } = await apiClient.get(`/analytics/dataset-profile?dataset_id=${encodeURIComponent(datasetId)}`);
    return data as DatasetProfile;
  },
  async queryDiagnostics(datasetId: string, queryId: string, experimentIds: string[] = [], k = 10) {
    const ids = experimentIds.length ? `&experiment_ids=${experimentIds.map(encodeURIComponent).join(',')}` : '';
    const { data } = await apiClient.get(`/analytics/query-diagnostics?dataset_id=${encodeURIComponent(datasetId)}&query_id=${encodeURIComponent(queryId)}&k=${k}${ids}`);
    return data as QueryDiagnostics;
  },
  async pairwise(datasetId: string, leftExperimentId: string, rightExperimentId: string, k = 10) {
    const { data } = await apiClient.get(`/analytics/pairwise?dataset_id=${encodeURIComponent(datasetId)}&left_experiment_id=${encodeURIComponent(leftExperimentId)}&right_experiment_id=${encodeURIComponent(rightExperimentId)}&k=${k}`);
    return data as PairwiseComparison;
  },
  async correlations(datasetId: string, k = 10, suiteId?: string) {
    const suite = suiteId ? `&suite_id=${encodeURIComponent(suiteId)}` : '';
    const { data } = await apiClient.get(`/analytics/correlations?dataset_id=${encodeURIComponent(datasetId)}&k=${k}${suite}`);
    return data as CorrelationData;
  },
  async insights(datasetId: string, suiteId?: string) {
    const suite = suiteId ? `&suite_id=${encodeURIComponent(suiteId)}` : '';
    const { data } = await apiClient.get(`/analytics/insights?dataset_id=${encodeURIComponent(datasetId)}${suite}`);
    return data as InsightSummary;
  },
  async metricMatrix(datasetId: string, suiteId?: string) {
    const suite = suiteId ? `&suite_id=${encodeURIComponent(suiteId)}` : '';
    const { data } = await apiClient.get(`/analytics/metric-matrix?dataset_id=${encodeURIComponent(datasetId)}${suite}`);
    return data as MetricMatrix;
  },
  async failureHeatmap(datasetId: string, suiteId?: string, k = 10) {
    const suite = suiteId ? `&suite_id=${encodeURIComponent(suiteId)}` : '';
    const { data } = await apiClient.get(`/analytics/failure-heatmap?dataset_id=${encodeURIComponent(datasetId)}&k=${k}${suite}`);
    return data as FailureHeatmap;
  },
  async rankMovement(datasetId: string, suiteId?: string, queryId?: string, k = 10) {
    const suite = suiteId ? `&suite_id=${encodeURIComponent(suiteId)}` : '';
    const query = queryId ? `&query_id=${encodeURIComponent(queryId)}` : '';
    const { data } = await apiClient.get(`/analytics/rank-movement?dataset_id=${encodeURIComponent(datasetId)}&k=${k}${suite}${query}`);
    return data as RankMovement;
  },
  async retrieverBattle(datasetId: string, suiteId?: string, k = 10) {
    const suite = suiteId ? `&suite_id=${encodeURIComponent(suiteId)}` : '';
    const { data } = await apiClient.get(`/analytics/retriever-battle?dataset_id=${encodeURIComponent(datasetId)}&k=${k}${suite}`);
    return data as RetrieverBattle;
  },
  async llmStatus() {
    const { data } = await apiClient.get('/llm/status');
    return data as LlmStatus;
  },
  async llmDashboard(datasetId = 'sample_default') {
    const { data } = await apiClient.get(`/llm/dashboard?dataset_id=${encodeURIComponent(datasetId)}`);
    return data as LlmDashboard;
  },
  async llmRuns(datasetId = 'sample_default') {
    const { data } = await apiClient.get(`/llm/runs?dataset_id=${encodeURIComponent(datasetId)}`);
    return data as LlmRunRecord[];
  },
  async badCaseSuggestion(caseId: string) {
    const { data } = await apiClient.post('/llm/bad-case-suggestion', { case_id: caseId });
    return data as BadCaseSuggestion;
  },
  async acceptBadCaseSuggestion(caseId: string) {
    const { data } = await apiClient.post(`/llm/bad-case-suggestion/${caseId}/accept`);
    return data as { status: string; case_id: string; suggestion?: BadCaseSuggestion };
  },
  async rejectBadCaseSuggestion(caseId: string) {
    const { data } = await apiClient.post(`/llm/bad-case-suggestion/${caseId}/reject`);
    return data as { status: string; case_id: string };
  },
  async queryRewrite(payload: { dataset_id: string; query?: string; query_id?: string; mode: RetrievalMode; k: number; alpha: number; require_real_llm?: boolean }) {
    const { data } = await apiClient.post('/llm/query-rewrite', payload);
    return data as QueryRewriteSandbox;
  },
  async queryRewriteExperiment(payload: { dataset_id: string; query_ids?: string[]; limit: number; mode: RetrievalMode; k: number; alpha: number; require_real_llm?: boolean }) {
    const { data } = await apiClient.post('/llm/query-rewrite-experiment', payload);
    return data as QueryRewriteExperiment;
  },
  async ragFaithfulness(answer_text: string, evidence: Array<Record<string, unknown>>, datasetId = 'sample_default', requireRealLlm = false) {
    const { data } = await apiClient.post('/llm/rag-faithfulness', { dataset_id: datasetId, answer_text, evidence, require_real_llm: requireRealLlm });
    return data as LlmFaithfulness;
  },
  async experimentNarrative(datasetId: string) {
    const { data } = await apiClient.post('/llm/experiment-narrative', { dataset_id: datasetId });
    return data as ExperimentNarrative;
  },
  async runTextMining(payload: { dataset_id: string; max_terms?: number; max_edges?: number; min_term_count?: number; min_support?: number; limit_docs?: number | null }) {
    const { data } = await apiClient.post('/text-mining/run', payload);
    return data as TextMiningSummary;
  },
  async textMiningSummary(datasetId: string, runId?: string) {
    const run = runId ? `&run_id=${encodeURIComponent(runId)}` : '';
    const { data } = await apiClient.get(`/text-mining/summary?dataset_id=${encodeURIComponent(datasetId)}${run}`);
    return data as TextMiningSummary;
  },
  async textTerms(datasetId: string, runId?: string, limit = 80) {
    const run = runId ? `&run_id=${encodeURIComponent(runId)}` : '';
    const { data } = await apiClient.get(`/text-mining/terms?dataset_id=${encodeURIComponent(datasetId)}&limit=${limit}${run}`);
    return data as TextTerms;
  },
  async textCooccurrence(datasetId: string, runId?: string, limit = 240) {
    const run = runId ? `&run_id=${encodeURIComponent(runId)}` : '';
    const { data } = await apiClient.get(`/text-mining/cooccurrence?dataset_id=${encodeURIComponent(datasetId)}&limit=${limit}${run}`);
    return data as TextCooccurrence;
  },
  async textCollocations(datasetId: string, runId?: string, limit = 80) {
    const run = runId ? `&run_id=${encodeURIComponent(runId)}` : '';
    const { data } = await apiClient.get(`/text-mining/collocations?dataset_id=${encodeURIComponent(datasetId)}&limit=${limit}${run}`);
    return data as TextCollocations;
  },
  async textNetwork(datasetId: string, runId?: string, limitEdges = 240) {
    const run = runId ? `&run_id=${encodeURIComponent(runId)}` : '';
    const { data } = await apiClient.get(`/text-mining/network?dataset_id=${encodeURIComponent(datasetId)}&limit_edges=${limitEdges}${run}`);
    return data as TextNetwork;
  },
  async textAssociationRules(datasetId: string, runId?: string, limit = 100) {
    const run = runId ? `&run_id=${encodeURIComponent(runId)}` : '';
    const { data } = await apiClient.get(`/text-mining/association-rules?dataset_id=${encodeURIComponent(datasetId)}&limit=${limit}${run}`);
    return data as TextAssociationRules;
  },
  async textSankey(datasetId: string, runId?: string) {
    const run = runId ? `&run_id=${encodeURIComponent(runId)}` : '';
    const { data } = await apiClient.get(`/text-mining/sankey?dataset_id=${encodeURIComponent(datasetId)}${run}`);
    return data as TextSankey;
  },
};
