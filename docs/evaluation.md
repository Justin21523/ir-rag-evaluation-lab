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
