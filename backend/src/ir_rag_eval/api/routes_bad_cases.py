import csv
import io
from datetime import UTC, datetime
from fastapi import APIRouter, HTTPException, Query, Response

from ir_rag_eval.api.schemas import BadCaseUpdateRequest
from ir_rag_eval.db.connection import connect
from ir_rag_eval.evaluation.bad_cases import BAD_CASE_TYPES

router = APIRouter(prefix="/bad-cases", tags=["bad-cases"])


@router.get("")
def list_bad_cases(experiment_id: str | None = None, case_type: str | None = None):
    clauses = []
    params = []
    if experiment_id:
        clauses.append("experiment_id = ?")
        params.append(experiment_id)
    if case_type:
        clauses.append("case_type = ?")
        params.append(case_type)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with connect() as con:
        rows = con.execute(f"SELECT * FROM bad_cases {where} ORDER BY query_id", params).fetchall()
    return [
        {
            "case_id": row[0],
            "experiment_id": row[1],
            "query_id": row[2],
            "case_type": row[3],
            "description": row[4],
            "expected_doc_ids_json": row[5],
            "retrieved_doc_ids_json": row[6],
            "notes": row[7] or "",
            "reviewer_label": row[8] or "needs_review",
            "updated_at": row[9],
        }
        for row in rows
    ]


@router.get("/export.csv")
def export_bad_cases(experiment_id: str | None = None, case_type: str | None = None):
    cases = list_bad_cases(experiment_id=experiment_id, case_type=case_type)
    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=[
            "case_id",
            "experiment_id",
            "query_id",
            "case_type",
            "description",
            "expected_doc_ids_json",
            "retrieved_doc_ids_json",
            "notes",
            "reviewer_label",
        ],
    )
    writer.writeheader()
    for case in cases:
        writer.writerow({key: case.get(key, "") for key in writer.fieldnames})
    return Response(buffer.getvalue(), media_type="text/csv")


@router.get("/{case_id}")
def get_bad_case(case_id: str):
    cases = list_bad_cases()
    for case in cases:
        if case["case_id"] == case_id:
            return case
    raise HTTPException(status_code=404, detail="Bad case not found")


@router.patch("/{case_id}")
def update_bad_case(case_id: str, request: BadCaseUpdateRequest):
    with connect() as con:
        row = con.execute("SELECT case_id FROM bad_cases WHERE case_id = ?", [case_id]).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Bad case not found")
        existing = con.execute("SELECT notes, reviewer_label FROM bad_cases WHERE case_id = ?", [case_id]).fetchone()
        notes = request.notes if request.notes is not None else existing[0]
        reviewer_label = request.reviewer_label if request.reviewer_label is not None else existing[1]
        con.execute(
            "UPDATE bad_cases SET notes = ?, reviewer_label = ?, updated_at = ? WHERE case_id = ?",
            [notes, reviewer_label, datetime.now(UTC), case_id],
        )
    return get_bad_case(case_id)
