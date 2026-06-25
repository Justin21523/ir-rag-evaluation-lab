from pathlib import Path

from ir_rag_eval.corpus.loader import load_documents, load_queries
from ir_rag_eval.corpus.sample_generator import generate_sample


def test_sample_generator_and_loader(tmp_path: Path):
    generate_sample(tmp_path)
    docs = load_documents(tmp_path / "documents.jsonl")
    queries = load_queries(tmp_path / "queries.jsonl")
    assert len(docs) >= 3
    assert docs[0].doc_id.startswith("doc_")
    assert queries[0].relevant_doc_ids
