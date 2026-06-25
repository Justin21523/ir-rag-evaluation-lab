import hashlib
import math
import os

from ir_rag_eval.corpus.validator import DocumentRecord
from ir_rag_eval.utils.text import tokenize


class DenseIndex:
    def __init__(self, documents: list[DocumentRecord], dim: int = 64, backend: str | None = None, model_name: str | None = None):
        self.documents = documents
        self.dim = dim
        self.backend = backend or os.getenv("IR_RAG_DENSE_BACKEND", "auto")
        self.model_name = model_name or os.getenv("IR_RAG_DENSE_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        self.fallback_reason: str | None = None
        self.model = self._load_model()
        self.doc_vectors = [self.embed(f"{doc.title} {doc.text}") for doc in documents]

    def _load_model(self):
        if self.backend == "mock":
            self.fallback_reason = "IR_RAG_DENSE_BACKEND=mock"
            return None
        try:
            from sentence_transformers import SentenceTransformer

            return SentenceTransformer(self.model_name)
        except Exception as exc:
            if self.backend == "sentence-transformers":
                self.fallback_reason = f"sentence-transformers unavailable: {exc}"
            else:
                self.fallback_reason = f"auto fallback: {exc}"
            return None

    def embed(self, text: str) -> list[float]:
        if self.model is not None:
            try:
                vector = self.model.encode([text], normalize_embeddings=True)[0]
                return [float(value) for value in vector]
            except Exception as exc:
                self.fallback_reason = f"encoding fallback: {exc}"
                self.model = None
        vector = [0.0] * self.dim
        for token in tokenize(text):
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            idx = int.from_bytes(digest[:2], "big") % self.dim
            sign = 1.0 if digest[2] % 2 == 0 else -1.0
            vector[idx] += sign
        norm = math.sqrt(sum(v * v for v in vector)) or 1.0
        return [v / norm for v in vector]

    def scores(self, query: str) -> list[float]:
        q = self.embed(query)
        return [sum(a * b for a, b in zip(q, doc_vec)) for doc_vec in self.doc_vectors]
