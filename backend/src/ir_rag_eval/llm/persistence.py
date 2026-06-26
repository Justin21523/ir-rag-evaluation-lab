import json
from uuid import uuid4

from ir_rag_eval.config import settings


def dumps(payload: object) -> str:
    return json.dumps(payload or {}, ensure_ascii=False)


def persist_llm_run(
    con,
    *,
    dataset_id: str,
    prompt_type: str,
    status: str,
    latency_ms: float | None,
    confidence: float | None,
    input_summary: str,
    output_summary: str,
    request_payload: dict | None = None,
    response_payload: dict | None = None,
    error_payload: dict | None = None,
) -> str:
    run_id = f"llm_run_{uuid4().hex[:12]}"
    con.execute(
        """
        INSERT INTO llm_runs
          (run_id, dataset_id, prompt_type, provider, model, status, latency_ms, confidence,
           input_summary, output_summary, request_json, response_json, error_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            run_id,
            dataset_id,
            prompt_type,
            settings.llm_provider,
            settings.llm_model,
            status,
            latency_ms,
            confidence,
            input_summary[:500],
            output_summary[:500],
            dumps(request_payload),
            dumps(response_payload),
            dumps(error_payload),
        ],
    )
    return run_id


def persist_llm_judgment(
    con,
    *,
    run_id: str,
    dataset_id: str,
    target_type: str,
    target_id: str,
    judgment: str,
    confidence: float | None,
    rationale: str,
    evidence_doc_ids: list[str] | None = None,
    review_status: str = "suggested",
) -> str:
    judgment_id = f"llm_judgment_{uuid4().hex[:12]}"
    con.execute(
        """
        INSERT INTO llm_judgments
          (judgment_id, run_id, dataset_id, target_type, target_id, judgment, confidence,
           rationale, evidence_doc_ids_json, review_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            judgment_id,
            run_id,
            dataset_id,
            target_type,
            target_id,
            judgment,
            confidence,
            rationale[:1000],
            dumps(evidence_doc_ids or []),
            review_status,
        ],
    )
    return judgment_id


def persist_llm_rewrite(
    con,
    *,
    run_id: str,
    dataset_id: str,
    query_id: str | None,
    rewrite_kind: str,
    rewrite_query: str,
    baseline_recall: float,
    rewrite_recall: float,
    baseline_ndcg: float,
    rewrite_ndcg: float,
    baseline_rank: int | None,
    rewrite_rank: int | None,
) -> str:
    rewrite_id = f"llm_rewrite_{uuid4().hex[:12]}"
    rank_delta = 0.0
    if baseline_rank is not None and rewrite_rank is not None:
        rank_delta = float(baseline_rank - rewrite_rank)
    elif baseline_rank is None and rewrite_rank is not None:
        rank_delta = 1000.0
    elif baseline_rank is not None and rewrite_rank is None:
        rank_delta = -1000.0
    con.execute(
        """
        INSERT INTO llm_rewrite_runs
          (rewrite_id, run_id, dataset_id, query_id, rewrite_kind, rewrite_query, baseline_recall,
           rewrite_recall, recall_delta, baseline_ndcg, rewrite_ndcg, ndcg_delta, rank_delta)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            rewrite_id,
            run_id,
            dataset_id,
            query_id,
            rewrite_kind,
            rewrite_query[:1000],
            baseline_recall,
            rewrite_recall,
            rewrite_recall - baseline_recall,
            baseline_ndcg,
            rewrite_ndcg,
            rewrite_ndcg - baseline_ndcg,
            rank_delta,
        ],
    )
    return rewrite_id
