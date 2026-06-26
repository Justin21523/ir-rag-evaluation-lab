from fastapi.testclient import TestClient

from ir_rag_eval.api.main import app


def test_evaluation_suite_run_and_scoped_analytics():
    client = TestClient(app)
    response = client.post(
        "/api/v1/evaluation-suites/run",
        json={"dataset_id": "sample_default", "retrievers": ["bm25"], "k_values": [1], "name": "test suite"},
    )
    assert response.status_code == 200
    suite_id = response.json()["suite_id"]
    suites = client.get("/api/v1/evaluation-suites?dataset_id=sample_default")
    assert suites.status_code == 200
    assert any(item["suite_id"] == suite_id for item in suites.json())
    overview = client.get(f"/api/v1/analytics/overview?dataset_id=sample_default&suite_id={suite_id}")
    assert overview.status_code == 200
    body = overview.json()
    assert body["suite_id"] == suite_id
    assert body["experiment_ids"]
    for path in [
        f"/api/v1/analytics/metric-matrix?dataset_id=sample_default&suite_id={suite_id}",
        f"/api/v1/analytics/failure-heatmap?dataset_id=sample_default&suite_id={suite_id}",
        f"/api/v1/analytics/rank-movement?dataset_id=sample_default&suite_id={suite_id}",
        f"/api/v1/analytics/retriever-battle?dataset_id=sample_default&suite_id={suite_id}",
    ]:
        analytic = client.get(path)
        assert analytic.status_code == 200
        assert analytic.json()["dataset_id"] == "sample_default"
