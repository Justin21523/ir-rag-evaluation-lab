# Evaluation

This lab evaluates retrieval before generation. The central question is whether the system retrieved the right evidence quickly and consistently.

## Precision@K

Precision@K measures how many of the top K retrieved documents are relevant.

Formula: `relevant retrieved in top K / K`

Use it when the user sees only a small result set and every irrelevant result creates review cost.

## Recall@K

Recall@K measures how many known relevant documents were found in the top K.

Formula: `relevant retrieved in top K / all relevant documents`

Use it for RAG, legal research, and evidence discovery, where missing a key source is often worse than showing an extra source.

## MRR

Mean Reciprocal Rank focuses on the first relevant hit.

Formula per query: `1 / rank of first relevant document`; average across queries.

Use it when the first correct result matters, such as navigational search or answer-oriented retrieval.

## MAP

Mean Average Precision rewards systems that rank all relevant documents early.

Average precision computes precision each time a relevant result appears, then averages over relevant documents. MAP averages that value across queries.

Use it when multiple relevant documents exist and their full ordering matters.

## nDCG@K

nDCG@K is a position-aware ranking metric normalized by the ideal ranking.

This MVP uses binary relevance. A relevant result at rank 1 receives more credit than the same result at rank 10.

Use it when ranking quality matters beyond simple hit/no-hit evaluation.

## Citation Coverage

Citation coverage measures whether answer citations cover retrieved evidence.

Formula: `cited evidence documents / retrieved evidence documents`

Coverage does not prove truth by itself, but low coverage is a strong signal that the generated answer may be poorly grounded.

## Answer Support Rate

Answer support rate estimates how much of the answer is supported by cited evidence. The lab splits the answer into claims, checks whether each claim cites retrieved evidence, and computes `supported claims / total claims`.

Production systems can replace this with a claim splitter and human-validated or model-assisted support labels.

## Latency

Latency is measured in milliseconds for each search call. Track it with metrics because a retriever with slightly better Recall@10 may be unacceptable if it is too slow for the target workflow.

## Zero-result Rate

Zero-result rate is the fraction of queries that return no documents.

Formula: `queries with zero results / total queries`

High zero-result rate often indicates tokenization issues, schema mismatch, missing corpus coverage, or overly strict filters.

## Per-query Analytics

Every evaluation run also stores query-level rows in DuckDB. For each query and K value, the lab records precision, recall, nDCG, reciprocal rank, average precision, first relevant rank, retrieved count, latency, bad case type, and difficulty label.

Difficulty labels are intentionally simple:

- `easy`: a relevant document appears in the top 3 and Recall@maxK is at least 0.5.
- `medium`: a relevant document appears within maxK but not strongly enough to be easy.
- `hard`: a relevant document exists but appears too low.
- `failed`: no relevant document was retrieved.

These rows drive the Evaluation Analytics page, HTML report charts, failed query tables, and dataset-level diagnostics.

## Query Diagnostics

Query diagnostics turns aggregate metrics into a single-query investigation. Given a dataset, query id, and one or more experiment ids, it returns the query text, relevant documents, each retriever ranking, score breakdowns, first relevant rank, latency, bad case type, and missed relevant document ids.

Use it when a chart point or failed query needs a concrete explanation.

## Pairwise Retriever Comparison

Pairwise comparison compares two experiment runs query by query. A query is a win, loss, or tie by lexicographic comparison of `Recall@K`, `nDCG@K`, and reciprocal rank. The report also records recall delta, nDCG delta, latency delta, rank delta, and relevant documents found by only one side.

This is the preferred view for deciding whether hybrid improves BM25 or dense retrieval.

## Correlation and Tradeoff Views

Correlation views expose tradeoffs that single aggregate metrics hide:

- `Recall@10` versus latency
- `nDCG@10` versus zero-result rate
- query length versus failure
- relevance-label count versus recall

These charts are diagnostic, not causal proof. Use them to identify query segments that deserve deeper inspection.

## Interactive Analytics Views

Metric matrix heatmaps compare retrievers across Recall@10, nDCG@10, MRR, latency, and zero-result rate in one compact grid. Use them to spot retrievers that win one metric but lose another.

Failure heatmaps show query-by-retriever failure intensity as `1 - Recall@K`. A dark cell means a specific retriever missed relevant evidence for a specific query. Clicking a cell should open query diagnostics.

Rank movement charts show where the first relevant document appears across BM25, dense, hybrid, and rerank. They are useful for identifying queries where a retriever does not miss relevance entirely but pushes it too low for a practical RAG context window.

Retriever battle charts aggregate all pairwise win/loss/tie outcomes. They are the high-level answer to whether hybrid, dense, or rerank actually improves the current baseline on the selected dataset or suite.

## Text Mining Analytics

Text mining views inspect corpus structure before blaming a retriever. They answer whether failures are connected to vocabulary sparsity, weak term overlap, narrow term communities, or metadata-specific language.

- Co-occurrence networks connect terms that appear in the same documents. Node size reflects term frequency; edge weight reflects shared document count.
- Collocation scores rank repeated bigrams/trigrams using deterministic PMI-style scoring. High-scoring phrases are useful for query expansion candidates.
- Association rules treat each document as a basket of terms and report support, confidence, lift, and conviction. High-lift rules expose terms that strongly imply each other.
- Sankey flows connect metadata category, term community, query difficulty, and failure/root-cause signals. They are diagnostic summaries, not causal proof.
- Term communities are connected components over the co-occurrence graph in the default lightweight implementation. Optional heavier backends can replace this with Louvain/Leiden later.

## Bad Case Root Cause Workflow

Bad cases can be reviewed with root cause, severity, owner, status, and notes. Supported root causes are `tokenization`, `entity_mismatch`, `semantic_drift`, `missing_corpus`, `poor_qrels`, `reranker_issue`, and `unknown`. Review status is `open`, `reviewed`, or `fixed`.

The goal is to turn retrieval failures into a triage queue, not just a static error table.
