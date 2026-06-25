try:
    from rank_bm25 import BM25Okapi
except Exception:  # pragma: no cover
    BM25Okapi = None

from ir_rag_eval.corpus.validator import DocumentRecord
from ir_rag_eval.utils.text import tokenize


class BM25Index:
    def __init__(self, documents: list[DocumentRecord]):
        self.documents = documents
        self.tokens = [tokenize(f"{doc.title} {doc.text}") for doc in documents]
        self.model = BM25Okapi(self.tokens) if BM25Okapi else None

    def scores(self, query: str) -> list[float]:
        query_tokens = tokenize(query)
        overlap_scores = [float(len(set(query_tokens) & set(doc_tokens))) for doc_tokens in self.tokens]
        if not self.model:
            return overlap_scores
        raw_scores = [float(score) for score in self.model.get_scores(query_tokens)]
        return [raw + overlap for raw, overlap in zip(raw_scores, overlap_scores)]
