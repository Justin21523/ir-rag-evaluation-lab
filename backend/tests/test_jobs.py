from pathlib import Path

from fastapi.testclient import TestClient

from ir_rag_eval.api.main import app
from ir_rag_eval.corpus.sample_generator import write_jsonl


def test_import_job_lifecycle(tmp_path: Path):
    dataset_dir = tmp_path / "beir"
    write_jsonl(dataset_dir / "corpus.jsonl", [{"_id": "d1", "title": "Doc", "text": "body"}])
    write_jsonl(dataset_dir / "queries.jsonl", [{"_id": "q1", "text": "body"}])
    (dataset_dir / "qrels").mkdir()
    (dataset_dir / "qrels" / "test.tsv").write_text("q1\t0\td1\t1\n", encoding="utf-8")
    client = TestClient(app)
    response = client.post(
        "/api/v1/corpus/datasets/import-job",
        json={
            "dataset_id": "job_fixture",
            "name": "Job Fixture",
            "dataset_type": "beir",
            "input_path": str(dataset_dir),
            "version": "test",
            "license": "test",
            "resume": True,
        },
    )
    assert response.status_code == 200
    job_id = response.json()["job_id"]
    for _ in range(50):
        job = client.get(f"/api/v1/jobs/{job_id}").json()
        if job["status"] in {"completed", "failed"}:
            break
    assert job["status"] == "completed"
    assert client.get(f"/api/v1/jobs/{job_id}/logs").json()


def test_experiment_batch_job_starts():
    client = TestClient(app)
    response = client.post(
        "/api/v1/experiments/run-batch",
        json={"dataset_id": "sample_default", "retrievers": ["bm25"], "k_values": [1], "alpha": 0.5, "dense_backend": "mock"},
    )
    assert response.status_code == 200
    assert response.json()["job_type"] == "experiment_batch"
