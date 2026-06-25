from pathlib import Path

from fastapi.testclient import TestClient

from ir_rag_eval.api.main import app
from ir_rag_eval.corpus.dataset_registry import import_jsonl_dataset
from ir_rag_eval.corpus.sample_generator import write_jsonl
from ir_rag_eval.db.connection import connect


def test_dataset_registry_and_quality_checks(tmp_path: Path):
    dataset_dir = tmp_path / "dataset"
    write_jsonl(
        dataset_dir / "documents.jsonl",
        [{"doc_id": "d1", "title": "Doc", "text": "body", "metadata": {"source": "test"}}],
    )
    write_jsonl(
        dataset_dir / "queries.jsonl",
        [{"query_id": "q1", "query": "body", "relevant_doc_ids": ["d1"]}],
    )
    with connect() as con:
        result = import_jsonl_dataset(con, "test_dataset", "Test Dataset", "custom", "v1", "test", dataset_dir)
    assert result["documents"] == 1

    client = TestClient(app)
    datasets = client.get("/api/v1/corpus/datasets").json()
    assert any(row["dataset_id"] == "test_dataset" for row in datasets)
    overview = client.get("/api/v1/corpus/overview?dataset_id=test_dataset").json()
    assert overview["document_count"] == 1
    assert overview["qrels_count"] == 1
    quality = client.get("/api/v1/corpus/datasets/test_dataset/quality").json()
    assert {row["check_name"] for row in quality} >= {"duplicate_documents", "empty_text_documents", "queries_missing_labels"}
