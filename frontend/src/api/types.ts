export type RetrievalMode = 'bm25' | 'dense' | 'hybrid' | 'rerank';

export interface DocumentRecord {
  doc_id: string;
  title: string;
  text: string;
  metadata: Record<string, unknown>;
}

export interface QueryRecord {
  query_id: string;
  query: string;
  relevant_doc_ids: string[];
}

export interface DatasetRecord {
  dataset_id: string;
  name: string;
  dataset_type: string;
  version: string;
  license: string;
  description: string;
  source_path: string;
  document_count: number;
  query_count: number;
  qrels_count: number;
  metadata: Record<string, unknown>;
}

export interface DatasetQualityCheck {
  check_name: string;
  severity: string;
  value: number;
  details: Record<string, unknown>;
}

export interface DatasetImport {
  import_id: string;
  dataset_id: string;
  status: string;
  input_path: string;
  seen_count: number;
  imported_count: number;
  skipped_count: number;
  duplicate_count: number;
  error_count: number;
  message: string;
}

export interface JobRecord {
  job_id: string;
  job_type: string;
  status: string;
  phase: string;
  progress_pct: number;
  config: Record<string, unknown>;
  result: Record<string, unknown>;
  error: Record<string, unknown>;
  cancel_requested: boolean;
  parent_job_id?: string;
}

export interface JobLog {
  log_id: string;
  job_id: string;
  level: string;
  phase: string;
  message: string;
  details: Record<string, unknown>;
}

export interface SearchResult {
  doc_id: string;
  title: string;
  text: string;
  score: number;
  rank: number;
  score_breakdown: Record<string, number>;
}

export interface SearchResponse {
  run_id: string;
  query_id: string;
  query: string;
  mode: RetrievalMode;
  k: number;
  alpha: number;
  latency_ms: number;
  relevant_doc_ids: string[];
  results: SearchResult[];
}

export interface Experiment {
  experiment_id: string;
  dataset_id: string;
  name: string;
  retriever_name: string;
  status: string;
  config_json: string;
}

export interface CompareExperiment extends Experiment {
  metrics: Record<string, number>;
}

export interface BadCase {
  case_id: string;
  experiment_id: string;
  query_id: string;
  case_type: string;
  description: string;
  expected_doc_ids_json: string;
  retrieved_doc_ids_json: string;
  notes: string;
  reviewer_label: string;
}

export interface RagClaim {
  claim_id: string;
  text: string;
  cited_doc_ids: string[];
  evidence_doc_ids: string[];
  supported: boolean;
  unsupported_reason: string;
}

export interface AnalyticsLeaderboardRow {
  experiment_id: string;
  retriever_name: string;
  'recall@10': number;
  'ndcg@10': number;
  mrr: number;
  latency_ms: number;
  zero_result_rate: number;
}

export interface AnalyticsPoint {
  retriever_name: string;
  k: number;
  value: number;
}

export interface AnalyticsOverview {
  dataset_id: string;
  leaderboard: AnalyticsLeaderboardRow[];
  curves: {
    recall: AnalyticsPoint[];
    ndcg: AnalyticsPoint[];
    precision: AnalyticsPoint[];
  };
  difficulty: Array<{ difficulty_label: string; query_count: number }>;
  bad_cases: Array<{ case_type: string; count: number }>;
  rank_histogram: Array<{ rank: number; count: number }>;
  latency_recall: Array<{ retriever_name: string; query_id: string; latency_ms: number; recall: number }>;
}

export interface QueryMetricRow {
  experiment_id: string;
  retriever_name: string;
  query_id: string;
  k: number;
  precision: number;
  recall: number;
  ndcg: number;
  reciprocal_rank: number;
  average_precision: number;
  first_relevant_rank: number | null;
  retrieved_count: number;
  latency_ms: number;
  bad_case_type: string;
  difficulty_label: string;
}

export interface DatasetProfile {
  dataset_id: string;
  document_lengths: Array<{ bucket: number; count: number }>;
  query_lengths: Array<{ bucket: number; count: number }>;
  metadata_treemap: Array<{ name: string; value: number }>;
  year_distribution: Array<{ year: string; count: number }>;
  label_density: Array<{ bucket: number; count: number }>;
}
