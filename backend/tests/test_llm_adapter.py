from fastapi.testclient import TestClient

from ir_rag_eval.api.main import app
from ir_rag_eval.llm.adapter import parse_json_object


def test_parse_json_object_from_markdown_fence():
    assert parse_json_object('```json\n{"ok": true}\n```') == {"ok": True}


def test_llm_status_offline_is_non_500():
    client = TestClient(app)
    response = client.get("/api/v1/llm/status")
    assert response.status_code == 200
    assert response.json()["assistive_signal"] is True
    assert "connected" in response.json()


def test_llm_query_rewrite_offline_fallback():
    client = TestClient(app)
    response = client.post(
        "/api/v1/llm/query-rewrite",
        json={"dataset_id": "sample_default", "query": "bm25 baseline", "mode": "bm25", "k": 3, "alpha": 0.5},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["assistive_signal"] is True
    assert body["run_id"]
    assert body["variants"]


def test_llm_dashboard_tracks_rewrite_runs():
    client = TestClient(app)
    response = client.post(
        "/api/v1/llm/query-rewrite-experiment",
        json={"dataset_id": "sample_default", "limit": 2, "mode": "bm25", "k": 3, "alpha": 0.5},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["query_count"] <= 2
    dashboard = client.get("/api/v1/llm/dashboard?dataset_id=sample_default")
    assert dashboard.status_code == 200
    assert dashboard.json()["total_runs"] >= 1
    assert "rewrite_improvement" in dashboard.json()


def test_llm_rag_faithfulness_persists_judgments():
    client = TestClient(app)
    response = client.post(
        "/api/v1/llm/rag-faithfulness",
        json={
            "dataset_id": "sample_default",
            "answer_text": "BM25 is a lexical baseline. Dense retrieval uses embeddings.",
            "evidence": [{"doc_id": "doc_001", "snippet": "BM25 is a lexical retrieval baseline."}],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["run_id"]
    assert body["claims"]
