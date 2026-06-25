from ir_rag_eval.indexing.bm25_index import BM25Index
from ir_rag_eval.indexing.dense_index import DenseIndex
from ir_rag_eval.utils.text import normalize_scores


class HybridIndex:
    def __init__(self, bm25: BM25Index, dense: DenseIndex):
        self.bm25 = bm25
        self.dense = dense

    def scores(self, query: str, alpha: float = 0.5) -> tuple[list[float], list[float], list[float]]:
        bm25_scores = normalize_scores(self.bm25.scores(query))
        dense_scores = normalize_scores(self.dense.scores(query))
        hybrid = [alpha * d + (1 - alpha) * b for b, d in zip(bm25_scores, dense_scores)]
        return hybrid, bm25_scores, dense_scores
