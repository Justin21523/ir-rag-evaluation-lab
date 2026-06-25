from fastapi.testclient import TestClient

from ir_rag_eval.api.main import app
from ir_rag_eval.db.connection import connect


def test_search_persists_run_and_results():
    client = TestClient(app)
    response = client.post("/api/v1/search", json={"query": "why use BM25 baseline", "mode": "bm25", "k": 3, "alpha": 0.5})
    assert response.status_code == 200
    run_id = response.json()["run_id"]
    with connect() as con:
        run = con.execute("SELECT run_id FROM search_runs WHERE run_id = ?", [run_id]).fetchone()
        results = con.execute("SELECT count(*) FROM search_results WHERE run_id = ?", [run_id]).fetchone()[0]
    assert run
    assert results > 0
