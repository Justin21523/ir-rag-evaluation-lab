from ir_rag_eval.corpus.validator import DocumentRecord
from ir_rag_eval.retrievers.dense import DenseRetriever


def test_dense_mock_embedding_is_deterministic():
    docs = [DocumentRecord(doc_id="d1", title="Dense retrieval", text="embedding vector search", metadata={})]
    retriever = DenseRetriever(docs)
    first = retriever.search("embedding search", k=1)[0].score
    second = retriever.search("embedding search", k=1)[0].score
    assert first == second
