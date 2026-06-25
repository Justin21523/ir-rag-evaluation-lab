from fastapi import APIRouter, HTTPException, Query

from ir_rag_eval.api.schemas import ExperimentBatchRequest
from ir_rag_eval.db.connection import connect
from ir_rag_eval.jobs.manager import create_job, get_job, run_background
from ir_rag_eval.jobs.tasks import run_experiment_batch_job

router = APIRouter(prefix="/experiments", tags=["experiments"])


@router.get("")
def list_experiments():
    with connect() as con:
        rows = con.execute(
            """
            SELECT experiment_id, dataset_id, name, retriever_name, config_json, status, started_at, finished_at
            FROM experiments ORDER BY started_at DESC
            """
        ).fetchall()
    return [
        {
            "experiment_id": row[0],
            "dataset_id": row[1],
            "name": row[2],
            "retriever_name": row[3],
            "config_json": row[4],
            "status": row[5],
            "started_at": row[6],
            "finished_at": row[7],
        }
        for row in rows
    ]


@router.get("/compare")
def compare(ids: str = Query(default="")):
    wanted = [item for item in ids.split(",") if item]
    payload = []
    for experiment_id in wanted:
        experiment_row = experiment(experiment_id)
        metric_rows = metrics(experiment_id)
        payload.append(
            {
                **experiment_row,
                "metrics": {row["metric_name"]: row["value"] for row in metric_rows},
                "metric_rows": metric_rows,
            }
        )
    return payload


@router.get("/{experiment_id}")
def experiment(experiment_id: str):
    with connect() as con:
        row = con.execute(
            """
            SELECT experiment_id, dataset_id, name, retriever_name, config_json, status, started_at, finished_at
            FROM experiments WHERE experiment_id = ?
            """,
            [experiment_id],
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return {
        "experiment_id": row[0],
        "dataset_id": row[1],
        "name": row[2],
        "retriever_name": row[3],
        "config_json": row[4],
        "status": row[5],
        "started_at": row[6],
        "finished_at": row[7],
    }


@router.get("/{experiment_id}/metrics")
def metrics(experiment_id: str):
    with connect() as con:
        rows = con.execute(
            "SELECT metric_name, k, value FROM metrics WHERE experiment_id = ? ORDER BY metric_name",
            [experiment_id],
        ).fetchall()
    return [{"metric_name": row[0], "k": row[1], "value": row[2]} for row in rows]


@router.post("/run-batch")
def run_batch(request: ExperimentBatchRequest):
    job_id = create_job("experiment_batch", request.model_dump())
    run_background(job_id, run_experiment_batch_job, request)
    return get_job(job_id)
