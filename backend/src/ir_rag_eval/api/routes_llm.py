from fastapi import APIRouter, HTTPException

from ir_rag_eval.api.schemas import BadCaseSuggestionRequest, ExperimentNarrativeRequest, LlmFaithfulnessRequest, LlmSuiteEvaluationRequest, QueryRewriteExperimentRequest, QueryRewriteRequest
from ir_rag_eval.db.connection import connect
from ir_rag_eval.llm.adapter import InvalidLlmOutput, LlmUnavailable
from ir_rag_eval.llm.service import (
    accept_bad_case_suggestion,
    bad_case_suggestion,
    experiment_narrative,
    llm_dashboard,
    llm_evaluate_suite,
    llm_run_detail,
    llm_runs,
    llm_status,
    query_rewrite_experiment,
    query_rewrite_sandbox,
    rag_faithfulness,
    reject_bad_case_suggestion,
)

router = APIRouter(prefix="/llm", tags=["llm"])


@router.get("/status")
def status():
    return llm_status()


@router.get("/dashboard")
def dashboard(dataset_id: str = "sample_default"):
    with connect() as con:
        return llm_dashboard(con, dataset_id)


@router.get("/runs")
def runs(dataset_id: str | None = None, prompt_type: str | None = None, status: str | None = None, limit: int = 100):
    with connect() as con:
        return llm_runs(con, dataset_id=dataset_id, prompt_type=prompt_type, status=status, limit=min(limit, 500))


@router.get("/runs/{run_id}")
def run_detail(run_id: str):
    with connect() as con:
        return llm_run_detail(con, run_id)


@router.post("/bad-case-suggestion")
def suggest_bad_case(request: BadCaseSuggestionRequest):
    with connect() as con:
        return bad_case_suggestion(con, request.case_id)


@router.post("/bad-case-suggestion/{case_id}/accept")
def accept_suggestion(case_id: str):
    with connect() as con:
        return accept_bad_case_suggestion(con, case_id)


@router.post("/bad-case-suggestion/{case_id}/reject")
def reject_suggestion(case_id: str):
    with connect() as con:
        return reject_bad_case_suggestion(con, case_id)


@router.post("/query-rewrite")
def rewrite_query(request: QueryRewriteRequest):
    with connect() as con:
        try:
            return query_rewrite_sandbox(request, con)
        except (LlmUnavailable, InvalidLlmOutput) as exc:
            raise HTTPException(status_code=424, detail=f"Real LLM required but unavailable or invalid: {exc}") from exc


@router.post("/query-rewrite-experiment")
def rewrite_experiment(request: QueryRewriteExperimentRequest):
    with connect() as con:
        try:
            return query_rewrite_experiment(request, con)
        except (LlmUnavailable, InvalidLlmOutput) as exc:
            raise HTTPException(status_code=424, detail=f"Real LLM required but unavailable or invalid: {exc}") from exc


@router.post("/rag-faithfulness")
def faithfulness(request: LlmFaithfulnessRequest):
    with connect() as con:
        try:
            return rag_faithfulness(request, con, request.dataset_id)
        except (LlmUnavailable, InvalidLlmOutput) as exc:
            raise HTTPException(status_code=424, detail=f"Real LLM required but unavailable or invalid: {exc}") from exc


@router.post("/evaluate-suite")
def evaluate_suite(request: LlmSuiteEvaluationRequest):
    with connect() as con:
        try:
            return llm_evaluate_suite(request, con)
        except (LlmUnavailable, InvalidLlmOutput) as exc:
            raise HTTPException(status_code=424, detail=f"Real LLM required but unavailable or invalid: {exc}") from exc


@router.post("/experiment-narrative")
def narrative(request: ExperimentNarrativeRequest):
    with connect() as con:
        return experiment_narrative(con, request.dataset_id)
