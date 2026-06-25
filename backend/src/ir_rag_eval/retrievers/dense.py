from ir_rag_eval.corpus.validator import DocumentRecord
from ir_rag_eval.indexing.dense_index import DenseIndex
from ir_rag_eval.retrievers.base import SearchResult


class DenseRetriever:
    name = "dense"

    def __init__(self, documents: list[DocumentRecord]):
        self.documents = documents
        self.index = DenseIndex(documents)

    def search(self, query: str, k: int = 10, **kwargs) -> list[SearchResult]:
        scores = self.index.scores(query)
        ranked = sorted(enumerate(scores), key=lambda item: item[1], reverse=True)[:k]
        return [
            SearchResult(
                doc_id=self.documents[i].doc_id,
                title=self.documents[i].title,
                text=self.documents[i].text,
                score=float(score),
                rank=rank,
                score_breakdown={
                    "dense": float(score),
                    "embedding": 1.0,
                    "mock_fallback": 1.0 if self.index.model is None else 0.0,
                },
            )
            for rank, (i, score) in enumerate(ranked, start=1)
        ]
