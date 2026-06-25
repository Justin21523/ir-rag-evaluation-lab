from ir_rag_eval.corpus.validator import DocumentRecord
from ir_rag_eval.indexing.bm25_index import BM25Index
from ir_rag_eval.retrievers.base import SearchResult


class BM25Retriever:
    name = "bm25"

    def __init__(self, documents: list[DocumentRecord]):
        self.documents = documents
        self.index = BM25Index(documents)

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
                score_breakdown={"bm25": float(score)},
            )
            for rank, (i, score) in enumerate(ranked, start=1)
            if score > 0
        ]
