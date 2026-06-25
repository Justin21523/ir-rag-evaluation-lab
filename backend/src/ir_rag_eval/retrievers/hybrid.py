from ir_rag_eval.corpus.validator import DocumentRecord
from ir_rag_eval.indexing.bm25_index import BM25Index
from ir_rag_eval.indexing.dense_index import DenseIndex
from ir_rag_eval.indexing.hybrid_index import HybridIndex
from ir_rag_eval.retrievers.base import SearchResult


class HybridRetriever:
    name = "hybrid"

    def __init__(self, documents: list[DocumentRecord]):
        self.documents = documents
        self.index = HybridIndex(BM25Index(documents), DenseIndex(documents))

    def search(self, query: str, k: int = 10, alpha: float = 0.5, **kwargs) -> list[SearchResult]:
        alpha = min(max(alpha, 0.0), 1.0)
        scores, bm25_scores, dense_scores = self.index.scores(query, alpha=alpha)
        ranked = sorted(enumerate(scores), key=lambda item: item[1], reverse=True)[:k]
        return [
            SearchResult(
                doc_id=self.documents[i].doc_id,
                title=self.documents[i].title,
                text=self.documents[i].text,
                score=float(score),
                rank=rank,
                score_breakdown={
                    "bm25": float(bm25_scores[i]),
                    "dense": float(dense_scores[i]),
                    "alpha": float(alpha),
                },
            )
            for rank, (i, score) in enumerate(ranked, start=1)
        ]
