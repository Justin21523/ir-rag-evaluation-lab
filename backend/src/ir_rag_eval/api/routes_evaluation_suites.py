from fastapi import APIRouter, HTTPException

from ir_rag_eval.api.schemas import EvaluationSuiteRequest
from ir_rag_eval.db.connection import connect
from ir_rag_eval.experiments.suites import get_suite, list_suites, run_evaluation_suite

router = APIRouter(prefix="/evaluation-suites", tags=["evaluation-suites"])


@router.get("")
def suites(dataset_id: str | None = None):
    with connect() as con:
        return list_suites(con, dataset_id)


@router.get("/{suite_id}")
def suite_detail(suite_id: str):
    with connect() as con:
        suite = get_suite(con, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="Suite not found")
    return suite


@router.post("/run")
def run_suite(request: EvaluationSuiteRequest):
    return run_evaluation_suite(request.dataset_id, list(request.retrievers), request.k_values, request.name)
