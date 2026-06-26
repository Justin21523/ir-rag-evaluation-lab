from fastapi.testclient import TestClient

from ir_rag_eval.api.main import app


def test_upload_custom_corpus_creates_dataset():
    client = TestClient(app)
    docs = b'{"doc_id":"upload_doc_1","title":"Upload Doc","text":"BM25 baseline and RAG citation evidence","metadata":{"source":"test","category":"demo"}}\n'
    queries = b'{"query_id":"upload_q_1","query":"BM25 citation evidence","relevant_doc_ids":["upload_doc_1"]}\n'
    response = client.post(
        "/api/v1/corpus/upload",
        data={"dataset_id": "upload_test_dataset", "name": "Upload Test Dataset"},
        files={
            "documents_file": ("documents.jsonl", docs, "application/x-ndjson"),
            "queries_file": ("queries.jsonl", queries, "application/x-ndjson"),
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["dataset_id"] == "upload_test_dataset"
    assert payload["document_count"] == 1
    assert payload["query_count"] == 1
    overview = client.get("/api/v1/corpus/overview?dataset_id=upload_test_dataset")
    assert overview.status_code == 200
    assert overview.json()["qrels_count"] == 1
