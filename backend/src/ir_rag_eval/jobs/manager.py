import json
import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from uuid import uuid4

from ir_rag_eval.db.connection import connect

executor = ThreadPoolExecutor(max_workers=2)


class JobCancelled(Exception):
    pass


def utcnow():
    return datetime.now(UTC)


def create_job(job_type: str, config: dict, parent_job_id: str | None = None) -> str:
    job_id = f"job_{uuid4().hex[:10]}"
    with connect() as con:
        con.execute(
            """
            INSERT INTO jobs
            (job_id, job_type, status, phase, progress_pct, config_json, result_json, error_json, cancel_requested, parent_job_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [job_id, job_type, "queued", "queued", 0.0, json.dumps(config), "{}", "{}", False, parent_job_id, utcnow()],
        )
        append_log(con, job_id, "info", "queued", f"{job_type} job queued", {})
    return job_id


def append_log(con, job_id: str, level: str, phase: str, message: str, details: dict | None = None) -> None:
    con.execute(
        "INSERT INTO job_logs VALUES (?, ?, ?, ?, ?, ?, ?)",
        [f"log_{uuid4().hex[:10]}", job_id, utcnow(), level, phase, message, json.dumps(details or {}, ensure_ascii=False, default=str)],
    )


def update_job(job_id: str, *, status: str | None = None, phase: str | None = None, progress: float | None = None, result: dict | None = None, error: dict | None = None) -> None:
    assignments = []
    params = []
    if status is not None:
        assignments.append("status = ?")
        params.append(status)
        if status == "running":
            assignments.append("started_at = COALESCE(started_at, ?)")
            params.append(utcnow())
        if status in {"completed", "failed", "cancelled", "failed_stale"}:
            assignments.append("finished_at = ?")
            params.append(utcnow())
    if phase is not None:
        assignments.append("phase = ?")
        params.append(phase)
    if progress is not None:
        assignments.append("progress_pct = ?")
        params.append(float(progress))
    if result is not None:
        assignments.append("result_json = ?")
        params.append(json.dumps(result, ensure_ascii=False, default=str))
    if error is not None:
        assignments.append("error_json = ?")
        params.append(json.dumps(error, ensure_ascii=False, default=str))
    if not assignments:
        return
    params.append(job_id)
    with connect() as con:
        con.execute(f"UPDATE jobs SET {', '.join(assignments)} WHERE job_id = ?", params)


def is_cancel_requested(job_id: str) -> bool:
    with connect() as con:
        row = con.execute("SELECT cancel_requested FROM jobs WHERE job_id = ?", [job_id]).fetchone()
    return bool(row and row[0])


def request_cancel(job_id: str) -> None:
    with connect() as con:
        con.execute("UPDATE jobs SET cancel_requested = TRUE WHERE job_id = ?", [job_id])
        append_log(con, job_id, "warning", "cancel", "Cancel requested", {})


def get_job(job_id: str) -> dict | None:
    with connect() as con:
        row = con.execute(
            """
            SELECT job_id, job_type, status, phase, progress_pct, config_json, result_json, error_json,
                   cancel_requested, parent_job_id, created_at, started_at, finished_at
            FROM jobs WHERE job_id = ?
            """,
            [job_id],
        ).fetchone()
    if not row:
        return None
    return {
        "job_id": row[0],
        "job_type": row[1],
        "status": row[2],
        "phase": row[3],
        "progress_pct": row[4],
        "config": json.loads(row[5] or "{}"),
        "result": json.loads(row[6] or "{}"),
        "error": json.loads(row[7] or "{}"),
        "cancel_requested": row[8],
        "parent_job_id": row[9],
        "created_at": row[10],
        "started_at": row[11],
        "finished_at": row[12],
    }


def list_jobs(job_type: str | None = None, status: str | None = None) -> list[dict]:
    clauses = []
    params = []
    if job_type:
        clauses.append("job_type = ?")
        params.append(job_type)
    if status:
        clauses.append("status = ?")
        params.append(status)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with connect() as con:
        rows = con.execute(
            f"""
            SELECT job_id, job_type, status, phase, progress_pct, config_json, result_json, error_json,
                   cancel_requested, parent_job_id, created_at, started_at, finished_at
            FROM jobs {where} ORDER BY created_at DESC
            """,
            params,
        ).fetchall()
    return [
        {
            "job_id": row[0],
            "job_type": row[1],
            "status": row[2],
            "phase": row[3],
            "progress_pct": row[4],
            "config": json.loads(row[5] or "{}"),
            "result": json.loads(row[6] or "{}"),
            "error": json.loads(row[7] or "{}"),
            "cancel_requested": row[8],
            "parent_job_id": row[9],
            "created_at": row[10],
            "started_at": row[11],
            "finished_at": row[12],
        }
        for row in rows
    ]


def list_logs(job_id: str) -> list[dict]:
    with connect() as con:
        rows = con.execute(
            "SELECT log_id, job_id, created_at, level, phase, message, details_json FROM job_logs WHERE job_id = ? ORDER BY created_at",
            [job_id],
        ).fetchall()
    return [
        {"log_id": row[0], "job_id": row[1], "created_at": row[2], "level": row[3], "phase": row[4], "message": row[5], "details": json.loads(row[6] or "{}")}
        for row in rows
    ]


def run_background(job_id: str, fn, *args, **kwargs) -> None:
    def wrapped():
        try:
            update_job(job_id, status="running", phase="running", progress=1)
            result = fn(job_id, *args, **kwargs)
            if get_job(job_id)["status"] != "cancelled":
                update_job(job_id, status="completed", phase="completed", progress=100, result=result)
        except JobCancelled:
            update_job(job_id, status="cancelled", phase="cancelled", progress=100)
        except Exception as exc:
            update_job(job_id, status="failed", phase="failed", error={"message": str(exc), "traceback": traceback.format_exc()})
            with connect() as con:
                append_log(con, job_id, "error", "failed", str(exc), {"traceback": traceback.format_exc()})

    executor.submit(wrapped)
