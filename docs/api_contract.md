# API Contract

All API endpoints are prefixed with `/api/v1`.

Search request:

```json
{"query":"string","mode":"bm25","k":10,"alpha":0.5}
```

Evaluate request:

```json
{"retriever_name":"bm25","k_values":[1,3,5,10]}
```

RAG answer request:

```json
{"query":"string","mode":"hybrid","k":5,"alpha":0.5}
```

LLM status and history:

- `GET /api/v1/llm/status`
- `GET /api/v1/llm/dashboard?dataset_id=sample_default`
- `GET /api/v1/llm/runs?dataset_id=sample_default`
- `GET /api/v1/llm/runs/{run_id}`

LLM query rewrite request:

```json
{"dataset_id":"sample_default","query":"bm25 baseline","mode":"hybrid","k":10,"alpha":0.5}
```

LLM query rewrite experiment request:

```json
{"dataset_id":"sample_default","query_ids":[],"limit":20,"mode":"hybrid","k":10,"alpha":0.5,"require_real_llm":true}
```

LLM RAG faithfulness request:

```json
{"dataset_id":"sample_default","answer_text":"answer with claims","evidence":[{"doc_id":"doc_001","snippet":"evidence text"}],"require_real_llm":true}
```

Evaluation suite request:

```json
{"dataset_id":"sample_ir_demo_100","retrievers":["bm25","dense","hybrid","rerank"],"k_values":[1,3,5,10],"name":"refresh-lab suite"}
```

Analytics endpoints:

- `GET /api/v1/analytics/overview?dataset_id=sample_ir_demo_100&suite_id=suite_x`
- `GET /api/v1/analytics/query-metrics?dataset_id=sample_ir_demo_100&suite_id=suite_x`
- `GET /api/v1/analytics/dataset-profile?dataset_id=sample_ir_demo_100`
- `GET /api/v1/analytics/correlations?dataset_id=sample_ir_demo_100&suite_id=suite_x&k=10`
- `GET /api/v1/analytics/insights?dataset_id=sample_ir_demo_100&suite_id=suite_x`
- `GET /api/v1/analytics/query-diagnostics?dataset_id=sample_ir_demo_100&query_id=q_001`
- `GET /api/v1/analytics/pairwise?dataset_id=sample_ir_demo_100&left_experiment_id=exp_a&right_experiment_id=exp_b`
- `GET /api/v1/analytics/metric-matrix?dataset_id=sample_ir_demo_100&suite_id=suite_x`
- `GET /api/v1/analytics/failure-heatmap?dataset_id=sample_ir_demo_100&suite_id=suite_x&k=10`
- `GET /api/v1/analytics/rank-movement?dataset_id=sample_ir_demo_100&suite_id=suite_x&k=10`
- `GET /api/v1/analytics/retriever-battle?dataset_id=sample_ir_demo_100&suite_id=suite_x&k=10`

`metric-matrix` powers the retriever-by-metric heatmap. `failure-heatmap` powers query-by-retriever failure intensity. `rank-movement` powers first relevant rank movement across retrievers. `retriever-battle` returns all pairwise win/loss/tie summaries for a selected dataset or suite.

LLM suite evaluation request:

```json
{"dataset_id":"sample_ir_demo_100","suite_id":"suite_x","limit_queries":5,"require_real_llm":true}
```

Strict LLM suite evaluation persists both RAG claim judgments and bad case suggestions. It returns counts for `rag_claim_runs` and `bad_case_suggestion_runs`; dashboard views aggregate real/fallback/failed runs, invalid JSON rate, confidence distribution, prompt-type latency, claim judgment distribution, and judgment-by-retriever.

Text mining run request:

```json
{"dataset_id":"sample_ir_demo_100","max_terms":80,"max_edges":240,"min_term_count":2,"min_support":0.02}
```

Text mining endpoints:

- `POST /api/v1/text-mining/run`
- `GET /api/v1/text-mining/summary?dataset_id=sample_ir_demo_100`
- `GET /api/v1/text-mining/terms?dataset_id=sample_ir_demo_100`
- `GET /api/v1/text-mining/cooccurrence?dataset_id=sample_ir_demo_100`
- `GET /api/v1/text-mining/collocations?dataset_id=sample_ir_demo_100`
- `GET /api/v1/text-mining/network?dataset_id=sample_ir_demo_100`
- `GET /api/v1/text-mining/association-rules?dataset_id=sample_ir_demo_100`
- `GET /api/v1/text-mining/sankey?dataset_id=sample_ir_demo_100`

These endpoints return persisted deterministic analysis results. The default engine uses token/ngram statistics, PMI, connected term communities, lightweight PageRank-style scores, and association rules without requiring model downloads.

Batch experiment request:

```json
{"dataset_id":"sample_ir_demo_100","retrievers":["bm25","dense","hybrid","rerank"],"k_values":[1,3,5,10],"alpha":0.5,"dense_backend":"auto"}
```

Import job request:

```json
{"dataset_id":"scifact","name":"SciFact","dataset_type":"beir","preset":"scifact","input_path":"data/raw/beir/scifact","version":"beir","license":"dataset-specific","resume":true,"batch_size":1000}
```
