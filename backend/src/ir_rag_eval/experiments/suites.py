import json
from datetime import UTC, datetime
from uuid import uuid4

from ir_rag_eval.analytics import persist_query_metrics
from ir_rag_eval.api.deps import get_documents, get_queries
from ir_rag_eval.corpus.validator import QueryRecord
from ir_rag_eval.db.connection import connect
from ir_rag_eval.evaluation.bad_case_generator import generate_bad_cases
from ir_rag_eval.evaluation.evaluator import evaluate_retriever_detailed
from ir_rag_eval.experiments.persistence import persist_experiment
from ir_rag_eval.experiments.registry import build_retriever
from ir_rag_eval.experiments.run_persistence import persist_search_run


DEFAULT_RETRIEVERS = ["bm25", "dense", "hybrid", "rerank"]
DEFAULT_K_VALUES = [1, 3, 5, 10]


def create_suite(con, dataset_id: str, name: str, config: dict) -> str:
    suite_id = f"suite_{uuid4().hex[:10]}"
    now = datetime.now(UTC)
    con.execute(
        """
        INSERT INTO evaluation_suites
        (suite_id, dataset_id, name, status, config_json, started_at, finished_at, summary_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [suite_id, dataset_id, name, "running", json.dumps(config, ensure_ascii=False), now, None, "{}"],
    )
    return suite_id


def finish_suite(con, suite_id: str, status: str, summary: dict) -> None:
    con.execute(
        """
        UPDATE evaluation_suites
        SET status = ?, finished_at = ?, summary_json = ?
        WHERE suite_id = ?
        """,
        [status, datetime.now(UTC), json.dumps(summary, ensure_ascii=False), suite_id],
    )


def run_evaluation_suite(
    dataset_id: str,
    retrievers: list[str] | None = None,
    k_values: list[int] | None = None,
    name: str | None = None,
) -> dict:
    retriever_names = retrievers or DEFAULT_RETRIEVERS
    use_k_values = k_values or DEFAULT_K_VALUES
    documents = get_documents(dataset_id)
    queries = [QueryRecord.model_validate(row) for row in get_queries(dataset_id)]
    summary: dict = {"dataset_id": dataset_id, "experiments": [], "bad_case_ids": []}
    with connect() as con:
        suite_id = create_suite(
            con,
            dataset_id,
            name or f"{dataset_id} reproducible evaluation",
            {"retrievers": retriever_names, "k_values": use_k_values},
        )
        try:
            for retriever_name in retriever_names:
                metrics, details = evaluate_retriever_detailed(build_retriever(retriever_name, documents), queries, use_k_values)
                experiment_id = persist_experiment(
                    con,
                    f"{retriever_name} {dataset_id} suite evaluation",
                    retriever_name,
                    metrics,
                    {"k_values": use_k_values, "dataset_id": dataset_id, "suite_id": suite_id},
                    dataset_id=dataset_id,
                    suite_id=suite_id,
                )
                for detail in details:
                    persist_search_run(
                        con,
                        retriever_name,
                        detail["query"].query_id,
                        detail["results"],
                        detail["latency_ms"],
                        {"k_values": use_k_values, "suite_id": suite_id},
                        experiment_id=experiment_id,
                        dataset_id=dataset_id,
                    )
                persist_query_metrics(con, dataset_id, experiment_id, retriever_name, details, use_k_values)
                bad_case_ids = generate_bad_cases(con, experiment_id, details, documents, k=max(use_k_values))
                summary["experiments"].append({"experiment_id": experiment_id, "retriever_name": retriever_name, "metrics": metrics})
                summary["bad_case_ids"].extend(bad_case_ids)
            finish_suite(con, suite_id, "completed", summary)
            return {"suite_id": suite_id, **summary}
        except Exception as exc:
            finish_suite(con, suite_id, "failed", {"error": str(exc), **summary})
            raise


def list_suites(con, dataset_id: str | None = None) -> list[dict]:
    params: list[object] = []
    where = ""
    if dataset_id:
        where = "WHERE dataset_id = ?"
        params.append(dataset_id)
    rows = con.execute(
        f"""
        SELECT suite_id, dataset_id, name, status, config_json, started_at, finished_at, summary_json
        FROM evaluation_suites {where}
        ORDER BY started_at DESC
        """,
        params,
    ).fetchall()
    return [serialize_suite(row) for row in rows]


def get_suite(con, suite_id: str) -> dict | None:
    row = con.execute(
        """
        SELECT suite_id, dataset_id, name, status, config_json, started_at, finished_at, summary_json
        FROM evaluation_suites WHERE suite_id = ?
        """,
        [suite_id],
    ).fetchone()
    if not row:
        return None
    return serialize_suite(row)


def serialize_suite(row) -> dict:
    return {
        "suite_id": row[0],
        "dataset_id": row[1],
        "name": row[2],
        "status": row[3],
        "config": json.loads(row[4] or "{}"),
        "started_at": row[5],
        "finished_at": row[6],
        "summary": json.loads(row[7] or "{}"),
    }
