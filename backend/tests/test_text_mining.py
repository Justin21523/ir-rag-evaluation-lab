from fastapi.testclient import TestClient

from ir_rag_eval.api.main import app
from ir_rag_eval.corpus.sample_generator import generate_sample_profiles
from ir_rag_eval.corpus.dataset_registry import import_jsonl_dataset
from ir_rag_eval.db.connection import connect
from ir_rag_eval.text_mining import run_text_mining


def test_text_mining_pipeline_and_api(tmp_path, monkeypatch):
    db_path = tmp_path / "lab.duckdb"
    data_dir = tmp_path / "data"
    monkeypatch.setattr("ir_rag_eval.config.settings.db_path", db_path)
    monkeypatch.setattr("ir_rag_eval.config.settings.data_dir", data_dir)
    profile = generate_sample_profiles(data_dir)[0]
    dataset_id = profile["dataset_id"]
    with connect(db_path) as con:
        import_jsonl_dataset(con, dataset_id, profile["name"], profile["dataset_type"], profile["version"], profile["license"], profile["path"], resume=True)
        result = run_text_mining(con, dataset_id, max_terms=40, max_edges=80)
    assert result["term_count"] > 0
    assert result["edge_count"] > 0
    client = TestClient(app)
    summary = client.get(f"/api/v1/text-mining/summary?dataset_id={dataset_id}")
    network = client.get(f"/api/v1/text-mining/network?dataset_id={dataset_id}")
    rules = client.get(f"/api/v1/text-mining/association-rules?dataset_id={dataset_id}")
    assert summary.status_code == 200
    assert summary.json()["available"] is True
    assert network.status_code == 200
    assert len(network.json()["nodes"]) > 0
    assert rules.status_code == 200
    assert "rules" in rules.json()
