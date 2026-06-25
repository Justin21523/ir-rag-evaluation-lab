import statistics
import time

from ir_rag_eval.corpus.validator import QueryRecord
from ir_rag_eval.evaluation.metrics import (
    average_precision,
    ndcg_at_k,
    precision_at_k,
    recall_at_k,
    reciprocal_rank,
)


def evaluate_retriever_detailed(retriever, queries: list[QueryRecord], k_values: list[int]) -> tuple[dict[str, float], list[dict]]:
    rows: list[dict] = []
    latencies: list[float] = []
    zero_results = 0
    details: list[dict] = []
    max_k = max(k_values or [10])
    for query in queries:
        started = time.perf_counter()
        results = retriever.search(query.query, k=max_k)
        latency_ms = (time.perf_counter() - started) * 1000
        latencies.append(latency_ms)
        retrieved = [result.doc_id for result in results]
        relevant = set(query.relevant_doc_ids)
        if not retrieved:
            zero_results += 1
        for k in k_values:
            rows.append(
                {
                    f"precision@{k}": precision_at_k(retrieved, relevant, k),
                    f"recall@{k}": recall_at_k(retrieved, relevant, k),
                    f"ndcg@{k}": ndcg_at_k(retrieved, relevant, k),
                }
            )
        rows.append({"mrr": reciprocal_rank(retrieved, relevant), "map": average_precision(retrieved, relevant)})
        details.append(
            {
                "query": query,
                "results": results,
                "retrieved_doc_ids": retrieved,
                "relevant_doc_ids": list(relevant),
                "latency_ms": latency_ms,
            }
        )
    keys = {key for row in rows for key in row}
    summary = {key: statistics.mean(row[key] for row in rows if key in row) for key in keys}
    summary["latency_ms"] = statistics.mean(latencies) if latencies else 0.0
    summary["zero_result_rate"] = zero_results / len(queries) if queries else 0.0
    return summary, details


def evaluate_retriever(retriever, queries: list[QueryRecord], k_values: list[int]) -> dict[str, float]:
    return evaluate_retriever_detailed(retriever, queries, k_values)[0]
