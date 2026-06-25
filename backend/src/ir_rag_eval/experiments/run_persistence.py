import json
from datetime import UTC, datetime
from uuid import uuid4


def persist_search_run(
    con,
    retriever_name: str,
    query_id: str,
    results,
    latency_ms: float,
    config: dict,
    experiment_id: str | None = None,
    dataset_id: str = "sample_default",
) -> str:
    run_id = f"run_{uuid4().hex[:10]}"
    con.execute(
        """
        INSERT INTO search_runs
        (run_id, dataset_id, experiment_id, retriever_name, query_id, config_json, created_at, latency_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [run_id, dataset_id, experiment_id, retriever_name, query_id, json.dumps(config), datetime.now(UTC), latency_ms],
    )
    for result in results:
        con.execute(
            """
            INSERT INTO search_results
            (dataset_id, experiment_id, run_id, query_id, doc_id, rank, score, score_breakdown_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                dataset_id,
                experiment_id,
                run_id,
                query_id,
                result.doc_id,
                result.rank,
                float(result.score),
                json.dumps(result.score_breakdown),
            ],
        )
    return run_id
