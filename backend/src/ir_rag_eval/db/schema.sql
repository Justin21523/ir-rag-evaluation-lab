CREATE TABLE IF NOT EXISTS documents (
  dataset_id VARCHAR DEFAULT 'sample_default',
  doc_id VARCHAR PRIMARY KEY,
  title VARCHAR,
  text VARCHAR,
  metadata_json VARCHAR,
  source VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queries (
  dataset_id VARCHAR DEFAULT 'sample_default',
  query_id VARCHAR PRIMARY KEY,
  query VARCHAR,
  relevant_doc_ids_json VARCHAR,
  metadata_json VARCHAR
);

CREATE TABLE IF NOT EXISTS indexes (
  index_id VARCHAR PRIMARY KEY,
  index_type VARCHAR,
  config_json VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_runs (
  run_id VARCHAR PRIMARY KEY,
  dataset_id VARCHAR DEFAULT 'sample_default',
  experiment_id VARCHAR,
  retriever_name VARCHAR,
  query_id VARCHAR,
  config_json VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  latency_ms DOUBLE
);

CREATE TABLE IF NOT EXISTS search_results (
  dataset_id VARCHAR DEFAULT 'sample_default',
  experiment_id VARCHAR,
  run_id VARCHAR,
  query_id VARCHAR,
  doc_id VARCHAR,
  rank INTEGER,
  score DOUBLE,
  score_breakdown_json VARCHAR
);

CREATE TABLE IF NOT EXISTS experiments (
  experiment_id VARCHAR PRIMARY KEY,
  dataset_id VARCHAR DEFAULT 'sample_default',
  name VARCHAR,
  retriever_name VARCHAR,
  config_json VARCHAR,
  status VARCHAR,
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metrics (
  experiment_id VARCHAR,
  metric_name VARCHAR,
  k INTEGER,
  value DOUBLE
);

CREATE TABLE IF NOT EXISTS rag_answers (
  answer_id VARCHAR PRIMARY KEY,
  query_id VARCHAR,
  answer_text VARCHAR,
  cited_doc_ids_json VARCHAR,
  evidence_json VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bad_cases (
  case_id VARCHAR PRIMARY KEY,
  experiment_id VARCHAR,
  query_id VARCHAR,
  case_type VARCHAR,
  description VARCHAR,
  expected_doc_ids_json VARCHAR,
  retrieved_doc_ids_json VARCHAR,
  notes VARCHAR,
  reviewer_label VARCHAR,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS datasets (
  dataset_id VARCHAR PRIMARY KEY,
  name VARCHAR,
  dataset_type VARCHAR,
  version VARCHAR,
  license VARCHAR,
  description VARCHAR,
  source_path VARCHAR,
  document_count INTEGER DEFAULT 0,
  query_count INTEGER DEFAULT 0,
  qrels_count INTEGER DEFAULT 0,
  metadata_json VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dataset_imports (
  import_id VARCHAR PRIMARY KEY,
  dataset_id VARCHAR,
  status VARCHAR,
  input_path VARCHAR,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  seen_count INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  message VARCHAR
);

CREATE TABLE IF NOT EXISTS dataset_quality_checks (
  check_id VARCHAR PRIMARY KEY,
  dataset_id VARCHAR,
  check_name VARCHAR,
  severity VARCHAR,
  value INTEGER,
  details_json VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  job_id VARCHAR PRIMARY KEY,
  job_type VARCHAR,
  status VARCHAR,
  phase VARCHAR,
  progress_pct DOUBLE DEFAULT 0,
  config_json VARCHAR,
  result_json VARCHAR,
  error_json VARCHAR,
  cancel_requested BOOLEAN DEFAULT FALSE,
  parent_job_id VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_logs (
  log_id VARCHAR PRIMARY KEY,
  job_id VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  level VARCHAR,
  phase VARCHAR,
  message VARCHAR,
  details_json VARCHAR
);

CREATE TABLE IF NOT EXISTS query_metrics (
  metric_id VARCHAR PRIMARY KEY,
  dataset_id VARCHAR,
  experiment_id VARCHAR,
  retriever_name VARCHAR,
  query_id VARCHAR,
  k INTEGER,
  precision DOUBLE,
  recall DOUBLE,
  ndcg DOUBLE,
  reciprocal_rank DOUBLE,
  average_precision DOUBLE,
  first_relevant_rank INTEGER,
  retrieved_count INTEGER,
  latency_ms DOUBLE,
  bad_case_type VARCHAR,
  difficulty_label VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
