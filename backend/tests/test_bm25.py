from ir_rag_eval.corpus.validator import DocumentRecord
from ir_rag_eval.retrievers.bm25 import BM25Retriever


def test_bm25_returns_relevant_document_first():
    docs = [
        DocumentRecord(doc_id="d1", title="BM25 retrieval", text="lexical search baseline", metadata={}),
        DocumentRecord(doc_id="d2", title="Cooking", text="pasta recipe", metadata={}),
    ]
    results = BM25Retriever(docs).search("lexical BM25 baseline", k=2)
    assert results[0].doc_id == "d1"
    assert results[0].score_breakdown["bm25"] > 0
