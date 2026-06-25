BAD_CASE_TYPES = [
    "no_relevant_documents_retrieved",
    "relevant_document_ranked_too_low",
    "lexical_only_failure",
    "semantic_only_failure",
    "hybrid_disagreement",
    "zero_result",
    "high_latency",
]


def classify_bad_case(retrieved: list[str], relevant: list[str], latency_ms: float = 0.0, k: int = 10) -> str | None:
    if not retrieved:
        return "zero_result"
    relevant_set = set(relevant)
    if not relevant_set & set(retrieved):
        return "no_relevant_documents_retrieved"
    first_relevant_rank = next((idx for idx, doc_id in enumerate(retrieved, start=1) if doc_id in relevant_set), None)
    if first_relevant_rank and first_relevant_rank > k:
        return "relevant_document_ranked_too_low"
    if latency_ms > 1000:
        return "high_latency"
    return None


def first_relevant_rank(retrieved: list[str], relevant: list[str]) -> int | None:
    relevant_set = set(relevant)
    return next((idx for idx, doc_id in enumerate(retrieved, start=1) if doc_id in relevant_set), None)


def classify_retrieval_pair(bm25_retrieved: list[str], dense_retrieved: list[str], relevant: list[str], k: int = 10) -> str | None:
    relevant_set = set(relevant)
    bm25_hit = bool(set(bm25_retrieved[:k]) & relevant_set)
    dense_hit = bool(set(dense_retrieved[:k]) & relevant_set)
    if bm25_hit and not dense_hit:
        return "semantic_only_failure"
    if dense_hit and not bm25_hit:
        return "lexical_only_failure"
    if bm25_retrieved[:k] != dense_retrieved[:k]:
        return "hybrid_disagreement"
    return None


def bad_case_description(case_type: str, query_id: str) -> str:
    descriptions = {
        "zero_result": "Query returned no retrieved documents.",
        "no_relevant_documents_retrieved": "No labeled relevant document was retrieved.",
        "relevant_document_ranked_too_low": "A relevant document was retrieved below the target rank threshold.",
        "lexical_only_failure": "BM25 missed relevant evidence that dense retrieval found.",
        "semantic_only_failure": "Dense retrieval missed relevant evidence that BM25 found.",
        "hybrid_disagreement": "BM25 and dense retrieval disagree on the top ranked documents.",
        "high_latency": "Search latency exceeded the configured threshold.",
    }
    return f"{query_id}: {descriptions.get(case_type, case_type)}"
