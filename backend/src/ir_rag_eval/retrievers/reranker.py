from ir_rag_eval.retrievers.base import SearchResult
from ir_rag_eval.retrievers.hybrid import HybridRetriever
from ir_rag_eval.utils.text import tokenize


class RerankerRetriever:
    name = "rerank"

    def __init__(self, base: HybridRetriever):
        self.base = base

    def search(self, query: str, k: int = 10, alpha: float = 0.5, **kwargs) -> list[SearchResult]:
        candidates = self.base.search(query, k=max(k * 2, k), alpha=alpha)
        q_tokens = set(tokenize(query))
        for result in candidates:
            overlap = len(q_tokens & set(tokenize(f"{result.title} {result.text}")))
            rerank_score = result.score + 0.05 * overlap
            result.score_breakdown["reranker"] = float(rerank_score)
            result.score = float(rerank_score)
        reranked = sorted(candidates, key=lambda item: item.score, reverse=True)[:k]
        for rank, result in enumerate(reranked, start=1):
            result.rank = rank
        return reranked
