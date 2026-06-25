from pathlib import Path

from ir_rag_eval.analytics import persist_query_metrics
from ir_rag_eval.api.deps import get_documents, get_queries
from ir_rag_eval.api.schemas import DatasetImportJobRequest, ExperimentBatchRequest
from ir_rag_eval.config import settings
from ir_rag_eval.corpus.dataset_loaders import convert_dataset
from ir_rag_eval.corpus.dataset_registry import compute_quality_checks, import_jsonl_dataset
from ir_rag_eval.corpus.validator import QueryRecord
from ir_rag_eval.db.connection import connect
from ir_rag_eval.evaluation.bad_case_generator import generate_bad_cases
from ir_rag_eval.evaluation.evaluator import evaluate_retriever_detailed
from ir_rag_eval.experiments.persistence import persist_experiment
from ir_rag_eval.experiments.registry import build_retriever
from ir_rag_eval.experiments.run_persistence import persist_search_run
from ir_rag_eval.jobs.manager import JobCancelled, append_log, is_cancel_requested, update_job
from ir_rag_eval.reporting import build_report

BEIR_PRESETS = {
    "scifact": {"license": "dataset-specific", "layout": "corpus.jsonl, queries.jsonl, qrels/*.tsv"},
    "nfcorpus": {"license": "dataset-specific", "layout": "corpus.jsonl, queries.jsonl, qrels/*.tsv"},
    "fiqa": {"license": "dataset-specific", "layout": "corpus.jsonl, queries.jsonl, qrels/*.tsv"},
    "trec-covid": {"license": "dataset-specific", "layout": "corpus.jsonl, queries.jsonl, qrels/*.tsv"},
}


def check_cancel(job_id: str) -> None:
    if is_cancel_requested(job_id):
        update_job(job_id, status="cancelled", phase="cancelled", progress=100)
        raise JobCancelled()


def run_import_job(job_id: str, request: DatasetImportJobRequest) -> dict:
    processed_dir = settings.data_dir / "processed" / request.dataset_id
    with connect() as con:
        append_log(con, job_id, "info", "convert", "Starting dataset conversion", request.model_dump())
    update_job(job_id, phase="convert", progress=10)
    check_cancel(job_id)
    convert_dataset(
        request.dataset_type,
        Path(request.input_path),
        processed_dir,
        None,
        request.limit_docs,
        request.limit_queries,
    )
    with connect() as con:
        append_log(con, job_id, "info", "validate", "Conversion completed; validating converted JSONL", {"output": str(processed_dir)})
    update_job(job_id, phase="validate", progress=35)
    check_cancel(job_id)
    update_job(job_id, phase="persist", progress=55)
    with connect() as con:
        result = import_jsonl_dataset(
            con,
            request.dataset_id,
            request.name,
            request.dataset_type,
            request.version,
            request.license,
            processed_dir,
            resume=request.resume,
        )
        append_log(con, job_id, "info", "persist", "Dataset persisted", result)
    check_cancel(job_id)
    update_job(job_id, phase="quality_check", progress=82)
    with connect() as con:
        checks = compute_quality_checks(con, request.dataset_id)
        append_log(con, job_id, "info", "quality_check", "Quality checks completed", {"checks": checks})
    update_job(job_id, phase="report", progress=92)
    with connect() as con:
        report = build_report(con, request.dataset_id)
        append_log(con, job_id, "info", "report", "Report generated", report)
    return {**result, "report": report, "quality_checks": checks}


def run_experiment_batch_job(job_id: str, request: ExperimentBatchRequest) -> dict:
    documents = get_documents(request.dataset_id)
    queries = [QueryRecord.model_validate(row) for row in get_queries(request.dataset_id)]
    experiment_ids: list[str] = []
    bad_case_ids: list[str] = []
    total = max(len(request.retrievers), 1)
    for idx, retriever_name in enumerate(request.retrievers, start=1):
        check_cancel(job_id)
        update_job(job_id, phase=f"run_{retriever_name}", progress=10 + (idx - 1) / total * 70)
        retriever = build_retriever(retriever_name, documents)
        metrics, details = evaluate_retriever_detailed(retriever, queries, request.k_values)
        with connect() as con:
            experiment_id = persist_experiment(
                con,
                f"{retriever_name} {request.dataset_id} batch evaluation",
                retriever_name,
                metrics,
                request.model_dump(),
                dataset_id=request.dataset_id,
            )
            for detail in details:
                persist_search_run(
                    con,
                    retriever_name,
                    detail["query"].query_id,
                    detail["results"],
                    detail["latency_ms"],
                    request.model_dump(),
                    experiment_id=experiment_id,
                    dataset_id=request.dataset_id,
                )
            persist_query_metrics(con, request.dataset_id, experiment_id, retriever_name, details, request.k_values)
            generated = generate_bad_cases(con, experiment_id, details, documents, k=max(request.k_values or [10]))
            append_log(con, job_id, "info", f"run_{retriever_name}", "Retriever completed", {"experiment_id": experiment_id, "metrics": metrics, "bad_cases": len(generated)})
        experiment_ids.append(experiment_id)
        bad_case_ids.extend(generated)
    update_job(job_id, phase="report", progress=92)
    with connect() as con:
        report = build_report(con, request.dataset_id)
        append_log(con, job_id, "info", "report", "Batch report generated", report)
    return {"dataset_id": request.dataset_id, "experiment_ids": experiment_ids, "bad_case_ids": bad_case_ids, "report": report}
