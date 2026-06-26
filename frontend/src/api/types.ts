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
  suite_id?: string | null;
  name: string;
  retriever_name: string;
  status: string;
  config_json: string;
}

export interface EvaluationSuite {
  suite_id: string;
  dataset_id: string;
  name: string;
  status: string;
  config: Record<string, unknown>;
  summary: Record<string, unknown>;
  started_at: string;
  finished_at: string | null;
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
  root_cause: string;
  severity: string;
  owner: string;
  review_status: string;
  llm_suggestion?: string;
  llm_review_status?: string;
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
  suite_id?: string | null;
  experiment_ids: string[];
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

export interface QueryDiagnosticsExperiment {
  experiment_id: string;
  retriever_name: string;
  name: string;
  k: number;
  metrics: {
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
  };
  ranking: Array<SearchResult & { is_relevant: boolean }>;
  missed_relevant_doc_ids: string[];
  llm_diagnosis?: {
    case_id: string;
    case_type: string;
    review_status?: string | null;
    suggestion: {
      suggested_root_cause?: string;
      suggested_severity?: string;
      why_failed?: string;
      possible_fix?: string;
      confidence?: number;
      rationale?: string;
    };
  } | null;
}

export interface QueryDiagnostics {
  dataset_id: string;
  query: QueryRecord;
  relevant_docs: DocumentRecord[];
  experiments: QueryDiagnosticsExperiment[];
}

export interface PairwiseComparison {
  dataset_id: string;
  left: { experiment_id: string; retriever_name: string; name: string };
  right: { experiment_id: string; retriever_name: string; name: string };
  summary: { wins: number; losses: number; ties: number; avg_recall_delta: number; avg_ndcg_delta: number; avg_latency_delta_ms: number };
  hybrid_summary: { left_is_hybrid: boolean; right_is_hybrid: boolean; hybrid_uplift_queries: number };
  queries: Array<{
    query_id: string;
    query: string;
    outcome: 'win' | 'loss' | 'tie';
    recall_delta: number;
    ndcg_delta: number;
    latency_delta_ms: number;
    rank_delta: number;
    left_only_relevant_doc_ids: string[];
    right_only_relevant_doc_ids: string[];
    left: QueryMetricRow;
    right: QueryMetricRow;
  }>;
}

export interface CorrelationData {
  dataset_id: string;
  suite_id?: string | null;
  recall_latency: Array<{ retriever_name: string; query_id: string; recall: number; latency_ms: number }>;
  ndcg_zero_result: Array<{ retriever_name: string; ndcg: number; zero_result_rate: number }>;
  query_length_failure: Array<{ query_id: string; retriever_name: string; query_length: number; failed: number }>;
  label_count_recall: Array<{ query_id: string; retriever_name: string; label_count: number; recall: number }>;
}

export interface MetricMatrix {
  dataset_id: string;
  suite_id?: string | null;
  experiment_ids: string[];
  metrics?: string[];
  rows: Array<{
    experiment_id: string;
    retriever_name: string;
    metric?: string;
    value?: number;
    [metricName: string]: string | number | undefined;
  }>;
}

export interface FailureHeatmap {
  dataset_id: string;
  suite_id?: string | null;
  rows: Array<{ query_id: string; query: string; retriever_name: string; experiment_id: string; recall: number; ndcg: number; first_relevant_rank: number | null; bad_case_type: string; difficulty_label: string; latency_ms: number }>;
}

export interface RankMovement {
  dataset_id: string;
  suite_id?: string | null;
  rows: Array<{ query_id: string; query: string; retriever_name: string; experiment_id: string; first_relevant_rank: number; recall: number; ndcg: number; latency_ms: number }>;
}

export interface RetrieverBattle {
  dataset_id: string;
  suite_id?: string | null;
  pairs: Array<{ left_experiment_id: string; left_retriever: string; right_experiment_id: string; right_retriever: string; wins: number; losses: number; ties: number; avg_recall_delta: number; avg_ndcg_delta: number; avg_latency_delta_ms: number; hybrid_uplift_queries: number }>;
}

export interface TextMiningSummary {
  dataset_id: string;
  run_id: string | null;
  available: boolean;
  document_count?: number;
  term_count?: number;
  edge_count?: number;
  rule_count?: number;
  summary?: { top_terms?: string[]; communities?: number; collocations?: number; association_rules?: number; sankey_links?: number };
  finished_at?: string | null;
}

export interface TextTerms {
  dataset_id: string;
  run_id: string | null;
  terms: Array<{ term: string; doc_count: number; term_count: number; tfidf: number; community_id: number; centrality: number }>;
}

export interface TextCooccurrence {
  dataset_id: string;
  run_id: string | null;
  edges: Array<{ source: string; target: string; weight: number; pmi: number; jaccard: number }>;
}

export interface TextCollocations {
  dataset_id: string;
  run_id: string | null;
  collocations: Array<{ phrase: string; n: number; count: number; pmi: number; score: number }>;
}

export interface TextNetwork {
  dataset_id: string;
  run_id: string | null;
  nodes: Array<{ id: string; name: string; value: number; degree: number; weighted_degree: number; pagerank: number; community_id: number }>;
  edges: Array<{ source: string; target: string; value: number; pmi: number }>;
}

export interface TextAssociationRules {
  dataset_id: string;
  run_id: string | null;
  rules: Array<{ antecedent: string[]; consequent: string[]; support: number; confidence: number; lift: number; conviction: number }>;
}

export interface TextSankey {
  dataset_id: string;
  run_id: string | null;
  nodes: Array<{ name: string }>;
  links: Array<{ source: string; target: string; value: number; stage: string }>;
}

export interface CorpusUploadResult {
  status: string;
  dataset_id: string;
  document_count: number;
  query_count: number;
  qrels_count: number;
  quality_checks: DatasetQualityCheck[];
}

export interface InsightSummary {
  dataset_id: string;
  cards: Array<{ kind: string; title: string; value: string; details: Record<string, unknown> }>;
  dense_beats_bm25_queries: PairwiseComparison['queries'];
}

export interface LlmStatus {
  provider: string;
  connected: boolean;
  status: string;
  base_url: string;
  model: string;
  context_size?: number | null;
  tokens_per_second?: number | null;
  last_latency_ms?: number | null;
  error?: string;
  assistive_signal: boolean;
}

export interface BadCaseSuggestion {
  assistive_signal: boolean;
  llm_status: string;
  suggested_root_cause: string;
  suggested_severity: string;
  why_failed: string;
  possible_fix: string;
  confidence: number;
  rationale: string;
  prompt_preview: string;
}

export interface QueryRewriteSandbox {
  assistive_signal: boolean;
  run_id?: string;
  llm_status: string;
  dataset_id: string;
  original_query: string;
  variants: Array<{
    kind: string;
    query: string;
    rationale: string;
    metrics: { recall: number; ndcg: number; first_relevant_rank: number | null; new_relevant_doc_ids: string[]; missed_relevant_doc_ids: string[] };
    results: SearchResult[];
  }>;
}

export interface QueryRewriteExperiment {
  assistive_signal: boolean;
  dataset_id: string;
  summary: {
    query_count: number;
    average_recall_delta: number;
    improved_queries: number;
    worsened_queries: number;
    unchanged_queries: number;
    best_strategy_distribution: Record<string, number>;
  };
  queries: Array<{
    query_id: string;
    query: string;
    run_id?: string;
    best_strategy: string;
    recall_delta: number;
    variants: QueryRewriteSandbox['variants'];
  }>;
}

export interface LlmFaithfulness {
  assistive_signal: boolean;
  run_id?: string;
  llm_status: string;
  claims: Array<{ claim_id: string; judgment: string; evidence_doc_ids: string[]; confidence: number; rationale: string }>;
  summary: string;
}

export interface ExperimentNarrative {
  assistive_signal: boolean;
  dataset_id: string;
  deterministic: InsightSummary;
  narrative: {
    assistive_signal: boolean;
    llm_status: string;
    analyst_notes: string;
    why_bm25_beats_dense: string;
    failing_query_types: string[];
    what_to_tune_next: string[];
    confidence: number;
    error?: string;
  };
}

export interface LlmRunRecord {
  run_id: string;
  dataset_id: string;
  prompt_type: string;
  provider: string;
  model: string;
  status: string;
  latency_ms: number | null;
  confidence: number | null;
  input_summary: string;
  output_summary: string;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  error: Record<string, unknown>;
  created_at: string;
}

export interface LlmDashboard {
  dataset_id: string;
  total_runs: number;
  real_run_count: number;
  fallback_run_count: number;
  failed_run_count: number;
  success_rate: number;
  invalid_json_rate: number;
  strict_failure_rate: number;
  average_latency_ms: number;
  average_confidence: number;
  claim_judgment_distribution: Record<string, number>;
  root_cause_distribution: Record<string, number>;
  judgment_by_retriever: Array<{ retriever_name: string; judgment: string; count: number }>;
  prompt_type_latency: Array<{ prompt_type: string; average_latency_ms: number; max_latency_ms: number; count: number }>;
  confidence_histogram: Array<{ bucket: string; count: number }>;
  latency_over_time: Array<{ created_at: string; prompt_type: string; latency_ms: number }>;
  slowest_prompts: Array<{ run_id: string; prompt_type: string; latency_ms: number; status: string }>;
  recent_runs: LlmRunRecord[];
  rewrite_improvement: Array<{ rewrite_kind: string; recall_delta: number; ndcg_delta: number; rank_delta: number; created_at: string }>;
}
