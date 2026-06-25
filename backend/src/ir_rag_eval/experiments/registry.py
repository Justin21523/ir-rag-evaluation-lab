from ir_rag_eval.retrievers.bm25 import BM25Retriever
from ir_rag_eval.retrievers.dense import DenseRetriever
from ir_rag_eval.retrievers.hybrid import HybridRetriever
from ir_rag_eval.retrievers.reranker import RerankerRetriever


def build_retriever(name: str, documents):
    if name == "bm25":
        return BM25Retriever(documents)
    if name == "dense":
        return DenseRetriever(documents)
    if name == "hybrid":
        return HybridRetriever(documents)
    if name == "rerank":
        return RerankerRetriever(HybridRetriever(documents))
    raise ValueError(f"Unknown retriever: {name}")
