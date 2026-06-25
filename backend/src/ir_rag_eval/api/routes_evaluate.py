from fastapi import APIRouter

from ir_rag_eval.analytics import persist_query_metrics
from ir_rag_eval.api.deps import get_documents, get_queries
from ir_rag_eval.api.schemas import EvaluateRequest
from ir_rag_eval.corpus.validator import QueryRecord
from ir_rag_eval.evaluation.bad_case_generator import generate_bad_cases
from ir_rag_eval.evaluation.evaluator import evaluate_retriever_detailed
from ir_rag_eval.experiments.persistence import persist_experiment
from ir_rag_eval.experiments.run_persistence import persist_search_run
from ir_rag_eval.experiments.registry import build_retriever
from ir_rag_eval.db.connection import connect

router = APIRouter(tags=["evaluate", "metrics"])


@router.post("/evaluate")
def evaluate(request: EvaluateRequest):
    documents = get_documents(request.dataset_id)
    queries = [QueryRecord.model_validate(row) for row in get_queries(request.dataset_id)]
    retriever = build_retriever(request.retriever_name, documents)
    metrics, details = evaluate_retriever_detailed(retriever, queries, request.k_values)
    with connect() as con:
        experiment_id = persist_experiment(
            con,
            name=f"{request.retriever_name} evaluation",
            retriever_name=request.retriever_name,
            metrics=metrics,
            config=request.model_dump(),
            dataset_id=request.dataset_id,
        )
        for detail in details:
            persist_search_run(
                con,
                request.retriever_name,
                detail["query"].query_id,
                detail["results"],
                detail["latency_ms"],
                request.model_dump(),
                experiment_id=experiment_id,
                dataset_id=request.dataset_id,
            )
        persist_query_metrics(con, request.dataset_id, experiment_id, request.retriever_name, details, request.k_values)
        bad_case_ids = generate_bad_cases(con, experiment_id, details, documents, k=max(request.k_values or [10]))
    return {"experiment_id": experiment_id, "metrics": metrics, "bad_case_ids": bad_case_ids}


@router.get("/metrics/definitions")
def metric_definitions():
    return {
        "precision@k": "Fraction of top-k retrieved documents that are relevant.",
        "recall@k": "Fraction of relevant documents retrieved in the top k.",
        "mrr": "Mean reciprocal rank of the first relevant result.",
        "map": "Mean average precision across queries.",
        "ndcg@k": "Position-aware ranking quality normalized by ideal ranking.",
        "latency": "Search response time in milliseconds.",
        "zero_result_rate": "Fraction of queries returning no results.",
        "citation_coverage": "Fraction of evidence documents cited by the answer.",
        "answer_support_rate": "Fraction of answer content supported by cited evidence.",
    }
