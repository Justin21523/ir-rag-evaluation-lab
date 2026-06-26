import json
from datetime import datetime, UTC
from uuid import uuid4


def persist_experiment(
    con,
    name: str,
    retriever_name: str,
    metrics: dict,
    config: dict | None = None,
    dataset_id: str = "sample_default",
    suite_id: str | None = None,
) -> str:
    experiment_id = f"exp_{uuid4().hex[:8]}"
    now = datetime.now(UTC)
    con.execute(
        """
        INSERT INTO experiments
        (experiment_id, dataset_id, suite_id, name, retriever_name, config_json, status, started_at, finished_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [experiment_id, dataset_id, suite_id, name, retriever_name, json.dumps(config or {}), "completed", now, now],
    )
    for metric_name, value in metrics.items():
        k = None
        if "@" in metric_name:
            try:
                k = int(metric_name.rsplit("@", 1)[1])
            except ValueError:
                k = None
        con.execute("INSERT INTO metrics VALUES (?, ?, ?, ?)", [experiment_id, metric_name, k, float(value)])
    return experiment_id
