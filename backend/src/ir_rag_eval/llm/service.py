import json
from collections import Counter, defaultdict
from datetime import UTC, datetime
from statistics import mean

from ir_rag_eval.analytics import insight_summary
from ir_rag_eval.api.deps import get_documents, get_queries
from ir_rag_eval.evaluation.rag_metrics import evaluate_answer
from ir_rag_eval.evaluation.metrics import ndcg_at_k, recall_at_k
from ir_rag_eval.experiments.registry import build_retriever
from ir_rag_eval.llm.adapter import InvalidLlmOutput, LlamaCppServerAdapter, LlmUnavailable, offline_payload
from ir_rag_eval.llm.persistence import persist_llm_judgment, persist_llm_rewrite, persist_llm_run
from ir_rag_eval.rag.answer_generator import generate_grounded_answer
from ir_rag_eval.rag.claims import split_claims


BAD_CASE_SYSTEM_PROMPT = """Return strict JSON only. You are an assistive IR evaluator, not ground truth.
Schema: {"suggested_root_cause":"tokenization|entity_mismatch|semantic_drift|missing_corpus|poor_qrels|reranker_issue|unknown","suggested_severity":"low|medium|high","why_failed":"string","possible_fix":"string","confidence":0.0,"rationale":"string","prompt_preview":"string"}"""

QUERY_REWRITE_SYSTEM_PROMPT = """Return strict JSON only.
Schema: {"rewrites":[{"kind":"lexical_expansion|semantic_paraphrase|entity_focused|domain_specific","query":"string","rationale":"string"}]}.
Return exactly four rewrites, one for each kind."""

FAITHFULNESS_SYSTEM_PROMPT = """Return strict JSON only. Judge whether each claim is supported by the provided evidence.
Schema: {"claims":[{"claim_id":"claim_001","judgment":"supported|partially_supported|unsupported|contradictory","evidence_doc_ids":["doc"],"confidence":0.0,"rationale":"string"}],"summary":"string"}"""

NARRATIVE_SYSTEM_PROMPT = """Return strict JSON only.
Schema: {"analyst_notes":"string","why_bm25_beats_dense":"string","failing_query_types":["string"],"what_to_tune_next":["string"],"confidence":0.0}"""


def llm_status() -> dict:
    return LlamaCppServerAdapter().status()


def bad_case_suggestion(con, case_id: str, require_real_llm: bool = False) -> dict:
    row = con.execute(
        """
        SELECT case_id, experiment_id, query_id, case_type, description, expected_doc_ids_json,
               retrieved_doc_ids_json, notes, reviewer_label, root_cause, severity
        FROM bad_cases WHERE case_id = ?
        """,
        [case_id],
    ).fetchone()
    if not row:
        return {"assistive_signal": True, "llm_status": "not_found", "error": "Bad case not found"}
    payload = {
        "case_id": row[0],
        "experiment_id": row[1],
        "query_id": row[2],
        "case_type": row[3],
        "description": row[4],
        "expected_doc_ids": json.loads(row[5] or "[]"),
        "retrieved_doc_ids": json.loads(row[6] or "[]"),
        "notes": row[7] or "",
        "current_label": row[8] or "needs_review",
        "current_root_cause": row[9] or "unknown",
        "current_severity": row[10] or "medium",
    }
    dataset_id = dataset_for_experiment(con, payload["experiment_id"])
    try:
        suggestion = LlamaCppServerAdapter().chat_json(BAD_CASE_SYSTEM_PROMPT, payload)
    except (LlmUnavailable, InvalidLlmOutput) as exc:
        if require_real_llm:
            raise
        suggestion = offline_payload(str(exc), fallback_bad_case_suggestion(payload))
    run_id = persist_llm_run(
        con,
        dataset_id=dataset_id,
        prompt_type="bad_case_root_cause",
        status=suggestion.get("llm_status", "ok"),
        latency_ms=suggestion.get("latency_ms"),
        confidence=suggestion.get("confidence"),
        input_summary=f"{payload['case_type']} {payload['query_id']}",
        output_summary=suggestion.get("why_failed") or suggestion.get("rationale") or "",
        request_payload=payload,
        response_payload=suggestion,
        error_payload={"error": suggestion.get("error")} if suggestion.get("error") else None,
    )
    persist_llm_judgment(
        con,
        run_id=run_id,
        dataset_id=dataset_id,
        target_type="bad_case",
        target_id=case_id,
        judgment=suggestion.get("suggested_root_cause", "unknown"),
        confidence=suggestion.get("confidence"),
        rationale=suggestion.get("rationale") or suggestion.get("why_failed") or "",
        evidence_doc_ids=payload["expected_doc_ids"] + payload["retrieved_doc_ids"],
    )
    con.execute(
        "UPDATE bad_cases SET llm_suggestion_json = ?, llm_review_status = ?, llm_updated_at = ? WHERE case_id = ?",
        [json.dumps(suggestion, ensure_ascii=False), "suggested", datetime.now(UTC), case_id],
    )
    return suggestion


def dataset_for_experiment(con, experiment_id: str | None) -> str:
    if not experiment_id:
        return "sample_default"
    row = con.execute("SELECT dataset_id FROM experiments WHERE experiment_id = ?", [experiment_id]).fetchone()
    return row[0] if row and row[0] else "sample_default"


def fallback_bad_case_suggestion(payload: dict) -> dict:
    case_type = payload.get("case_type", "")
    root = "unknown"
    if case_type in {"zero_result", "no_relevant_documents_retrieved"}:
        root = "missing_corpus"
    elif case_type == "relevant_document_ranked_too_low":
        root = "reranker_issue"
    elif case_type == "lexical_only_failure":
        root = "semantic_drift"
    elif case_type == "semantic_only_failure":
        root = "entity_mismatch"
    return {
        "suggested_root_cause": root,
        "suggested_severity": "high" if case_type in {"zero_result", "no_relevant_documents_retrieved"} else "medium",
        "why_failed": f"Deterministic fallback based on case type: {case_type}.",
        "possible_fix": "Inspect query terms, relevant labels, and retriever configuration before accepting this suggestion.",
        "confidence": 0.35,
        "rationale": "Local LLM was unavailable or returned invalid JSON; this is a rule-based fallback.",
        "prompt_preview": case_type,
    }


def accept_bad_case_suggestion(con, case_id: str) -> dict:
    row = con.execute("SELECT llm_suggestion_json FROM bad_cases WHERE case_id = ?", [case_id]).fetchone()
    if not row or not row[0]:
        return {"assistive_signal": True, "status": "no_suggestion", "case_id": case_id}
    suggestion = json.loads(row[0])
    con.execute(
        """
        UPDATE bad_cases
        SET root_cause = ?, severity = ?, llm_review_status = 'accepted', review_status = 'reviewed', updated_at = ?
        WHERE case_id = ?
        """,
        [
            suggestion.get("suggested_root_cause", "unknown"),
            suggestion.get("suggested_severity", "medium"),
            datetime.now(UTC),
            case_id,
        ],
    )
    return {"assistive_signal": True, "status": "accepted", "case_id": case_id, "suggestion": suggestion}


def reject_bad_case_suggestion(con, case_id: str) -> dict:
    con.execute("UPDATE bad_cases SET llm_review_status = 'rejected', updated_at = ? WHERE case_id = ?", [datetime.now(UTC), case_id])
    return {"assistive_signal": True, "status": "rejected", "case_id": case_id}


def query_rewrite_sandbox(request, con=None) -> dict:
    queries = get_queries(request.dataset_id)
    original_query = request.query or ""
    relevant_doc_ids: list[str] = []
    query_id = request.query_id
    if request.query_id:
        match = next((query for query in queries if query["query_id"] == request.query_id), None)
        if match:
            original_query = match["query"]
            relevant_doc_ids = match["relevant_doc_ids"]
    elif queries:
        match = next((query for query in queries if query["query"] == original_query), None)
        if match:
            query_id = match["query_id"]
            relevant_doc_ids = match["relevant_doc_ids"]
    payload = {"query": original_query, "dataset_id": request.dataset_id, "mode": request.mode}
    try:
        generated = LlamaCppServerAdapter().chat_json(QUERY_REWRITE_SYSTEM_PROMPT, payload)
        rewrites = generated.get("rewrites", [])
    except (LlmUnavailable, InvalidLlmOutput) as exc:
        if getattr(request, "require_real_llm", False):
            raise
        generated = offline_payload(str(exc))
        rewrites = fallback_rewrites(original_query)
    variants = [{"kind": "original", "query": original_query, "rationale": "Baseline query"}] + normalize_rewrites(rewrites)
    retriever = build_retriever(request.mode, get_documents(request.dataset_id))
    results = []
    for variant in variants:
        retrieved = retriever.search(variant["query"], k=request.k, alpha=request.alpha)
        retrieved_ids = [item.doc_id for item in retrieved]
        relevant = set(relevant_doc_ids)
        hits = set(retrieved_ids) & relevant
        results.append(
            {
                **variant,
                "metrics": {
                    "recall": recall_at_k(retrieved_ids, relevant, request.k),
                    "ndcg": ndcg_at_k(retrieved_ids, relevant, request.k),
                    "first_relevant_rank": next((idx for idx, doc_id in enumerate(retrieved_ids, start=1) if doc_id in relevant), None),
                    "new_relevant_doc_ids": sorted(hits),
                    "missed_relevant_doc_ids": sorted(relevant - hits),
                },
                "results": [
                    {"doc_id": item.doc_id, "title": item.title, "text": item.text, "score": item.score, "rank": item.rank, "score_breakdown": item.score_breakdown}
                    for item in retrieved
                ],
            }
        )
    run_id = None
    if con:
        best_variant = max(results, key=lambda item: (item["metrics"]["recall"], item["metrics"]["ndcg"])) if results else None
        run_id = persist_llm_run(
            con,
            dataset_id=request.dataset_id,
            prompt_type="query_rewrite",
            status=generated.get("llm_status", "ok"),
            latency_ms=generated.get("latency_ms"),
            confidence=generated.get("confidence"),
            input_summary=original_query,
            output_summary=(best_variant or {}).get("kind", ""),
            request_payload=payload,
            response_payload={"generated": generated, "variant_count": len(results)},
            error_payload={"error": generated.get("error")} if generated.get("error") else None,
        )
        baseline = next((item for item in results if item["kind"] == "original"), results[0] if results else None)
        for variant in results:
            if baseline:
                persist_llm_rewrite(
                    con,
                    run_id=run_id,
                    dataset_id=request.dataset_id,
                    query_id=query_id,
                    rewrite_kind=variant["kind"],
                    rewrite_query=variant["query"],
                    baseline_recall=baseline["metrics"]["recall"],
                    rewrite_recall=variant["metrics"]["recall"],
                    baseline_ndcg=baseline["metrics"]["ndcg"],
                    rewrite_ndcg=variant["metrics"]["ndcg"],
                    baseline_rank=baseline["metrics"]["first_relevant_rank"],
                    rewrite_rank=variant["metrics"]["first_relevant_rank"],
                )
    return {
        "assistive_signal": True,
        "run_id": run_id,
        "llm_status": generated.get("llm_status", "ok"),
        "dataset_id": request.dataset_id,
        "original_query": original_query,
        "variants": results,
    }


def query_rewrite_experiment(request, con) -> dict:
    queries = get_queries(request.dataset_id)
    selected = [query for query in queries if not request.query_ids or query["query_id"] in request.query_ids]
    selected = selected[: request.limit]
    query_results = []
    strategy_counter: Counter[str] = Counter()
    improved = worsened = unchanged = 0
    deltas = []
    for query in selected:
        single = type(
            "RewriteRequest",
            (),
            {
                "dataset_id": request.dataset_id,
                "query": None,
                "query_id": query["query_id"],
                "mode": request.mode,
                "k": request.k,
                "alpha": request.alpha,
            },
        )()
        result = query_rewrite_sandbox(single, con)
        variants = result["variants"]
        original = next((item for item in variants if item["kind"] == "original"), variants[0] if variants else None)
        candidates = [item for item in variants if item["kind"] != "original"]
        best = max(candidates, key=lambda item: (item["metrics"]["recall"], item["metrics"]["ndcg"]), default=original)
        recall_delta = (best["metrics"]["recall"] - original["metrics"]["recall"]) if best and original else 0.0
        if recall_delta > 0:
            improved += 1
        elif recall_delta < 0:
            worsened += 1
        else:
            unchanged += 1
        if best:
            strategy_counter[best["kind"]] += 1
        deltas.append(recall_delta)
        query_results.append(
            {
                "query_id": query["query_id"],
                "query": query["query"],
                "run_id": result.get("run_id"),
                "best_strategy": best["kind"] if best else "original",
                "recall_delta": recall_delta,
                "variants": variants,
            }
        )
    summary = {
        "query_count": len(query_results),
        "average_recall_delta": mean(deltas) if deltas else 0.0,
        "improved_queries": improved,
        "worsened_queries": worsened,
        "unchanged_queries": unchanged,
        "best_strategy_distribution": dict(strategy_counter),
    }
    return {"assistive_signal": True, "dataset_id": request.dataset_id, "summary": summary, "queries": query_results}


def fallback_rewrites(query: str) -> list[dict]:
    return [
        {"kind": "lexical_expansion", "query": f"{query} search retrieval exact match", "rationale": "Rule-based lexical expansion fallback."},
        {"kind": "semantic_paraphrase", "query": f"information need about {query}", "rationale": "Rule-based semantic paraphrase fallback."},
        {"kind": "entity_focused", "query": query, "rationale": "No entity extraction available while LLM is offline."},
        {"kind": "domain_specific", "query": f"{query} evaluation benchmark", "rationale": "Rule-based domain rewrite fallback."},
    ]


def normalize_rewrites(rewrites: list[dict]) -> list[dict]:
    wanted = ["lexical_expansion", "semantic_paraphrase", "entity_focused", "domain_specific"]
    by_kind = {item.get("kind"): item for item in rewrites if isinstance(item, dict)}
    return [
        {
            "kind": kind,
            "query": str(by_kind.get(kind, {}).get("query") or ""),
            "rationale": str(by_kind.get(kind, {}).get("rationale") or ""),
        }
        for kind in wanted
        if by_kind.get(kind, {}).get("query")
    ]


def rag_faithfulness(request, con=None, dataset_id: str = "sample_default", target_id: str = "ad_hoc_answer") -> dict:
    claims = [{"claim_id": f"claim_{idx:03d}", "text": text} for idx, text in enumerate(split_claims(request.answer_text), start=1)]
    payload = {"claims": claims, "evidence": request.evidence}
    try:
        judged = LlamaCppServerAdapter().chat_json(FAITHFULNESS_SYSTEM_PROMPT, payload)
    except (LlmUnavailable, InvalidLlmOutput) as exc:
        if getattr(request, "require_real_llm", False):
            raise
        judged = offline_payload(str(exc), {"claims": fallback_claim_judgments(claims, request.evidence), "summary": "Local LLM unavailable; deterministic fallback used."})
    judged.setdefault("claims", [])
    judged.setdefault("summary", "")
    judged["assistive_signal"] = True
    if con:
        avg_confidence = mean([float(item.get("confidence", 0) or 0) for item in judged["claims"]]) if judged["claims"] else None
        run_id = persist_llm_run(
            con,
            dataset_id=dataset_id,
            prompt_type="rag_faithfulness",
            status=judged.get("llm_status", "ok"),
            latency_ms=judged.get("latency_ms"),
            confidence=avg_confidence,
            input_summary=f"{len(claims)} claims for {target_id}",
            output_summary=judged.get("summary", ""),
            request_payload=payload,
            response_payload=judged,
            error_payload={"error": judged.get("error")} if judged.get("error") else None,
        )
        judged["run_id"] = run_id
        for claim in judged["claims"]:
            persist_llm_judgment(
                con,
                run_id=run_id,
                dataset_id=dataset_id,
                target_type="rag_claim",
                target_id=f"{target_id}:{claim.get('claim_id', '')}",
                judgment=claim.get("judgment", "unknown"),
                confidence=claim.get("confidence"),
                rationale=claim.get("rationale", ""),
                evidence_doc_ids=claim.get("evidence_doc_ids", []),
            )
    return judged


def fallback_claim_judgments(claims: list[dict], evidence: list[dict]) -> list[dict]:
    evidence_text = " ".join(str(item.get("snippet") or item.get("text") or "") for item in evidence).lower()
    rows = []
    for claim in claims:
        claim_text = claim["text"].lower()
        overlap = any(token and token in evidence_text for token in claim_text.split()[:12])
        rows.append(
            {
                "claim_id": claim["claim_id"],
                "judgment": "partially_supported" if overlap else "unsupported",
                "evidence_doc_ids": [str(item.get("doc_id")) for item in evidence[:1] if item.get("doc_id")],
                "confidence": 0.3,
                "rationale": "Rule-based fallback because local LLM was unavailable or invalid.",
            }
        )
    return rows


def experiment_narrative(con, dataset_id: str) -> dict:
    deterministic = insight_summary(con, dataset_id)
    try:
        narrative = LlamaCppServerAdapter().chat_json(NARRATIVE_SYSTEM_PROMPT, deterministic)
    except (LlmUnavailable, InvalidLlmOutput) as exc:
        narrative = offline_payload(
            str(exc),
            {
                "analyst_notes": "Local LLM unavailable; use deterministic insights only.",
                "why_bm25_beats_dense": "",
                "failing_query_types": [],
                "what_to_tune_next": ["Review deterministic bad cases and pairwise deltas."],
                "confidence": 0.0,
            },
        )
    persist_llm_run(
        con,
        dataset_id=dataset_id,
        prompt_type="experiment_narrative",
        status=narrative.get("llm_status", "ok"),
        latency_ms=narrative.get("latency_ms"),
        confidence=narrative.get("confidence"),
        input_summary=f"experiment insights for {dataset_id}",
        output_summary=narrative.get("analyst_notes", ""),
        request_payload=deterministic,
        response_payload=narrative,
        error_payload={"error": narrative.get("error")} if narrative.get("error") else None,
    )
    return {"assistive_signal": True, "dataset_id": dataset_id, "deterministic": deterministic, "narrative": narrative}


def llm_evaluate_suite(request, con) -> dict:
    status = llm_status()
    if request.require_real_llm and not status.get("connected"):
        raise LlmUnavailable(status.get("error") or "llama.cpp is not connected")
    rewrite_request = type(
        "RewriteExperimentRequest",
        (),
        {
            "dataset_id": request.dataset_id,
            "query_ids": [],
            "limit": request.limit_queries,
            "mode": "hybrid",
            "k": 10,
            "alpha": 0.5,
            "require_real_llm": request.require_real_llm,
        },
    )()
    rewrite_result = query_rewrite_experiment(rewrite_request, con)
    documents = get_documents(request.dataset_id)
    retriever = build_retriever("hybrid", documents)
    rag_count = 0
    for query in get_queries(request.dataset_id)[: request.limit_queries]:
        results = retriever.search(query["query"], k=5, alpha=0.5)
        generated = generate_grounded_answer(query["query"], results)
        evidence_ids = [item["doc_id"] for item in generated["evidence"]]
        evaluate_answer(generated["answer_text"], generated["cited_doc_ids"], evidence_ids)
        faithfulness_request = type(
            "FaithfulnessRequest",
            (),
            {"dataset_id": request.dataset_id, "answer_text": generated["answer_text"], "evidence": generated["evidence"], "require_real_llm": request.require_real_llm},
        )()
        rag_faithfulness(faithfulness_request, con, request.dataset_id, query["query_id"])
        rag_count += 1
    bad_case_rows = con.execute(
        """
        SELECT bc.case_id
        FROM bad_cases bc
        JOIN experiments e ON e.experiment_id = bc.experiment_id
        WHERE e.dataset_id = ? AND (? IS NULL OR e.suite_id = ?)
        ORDER BY bc.updated_at DESC
        LIMIT ?
        """,
        [request.dataset_id, request.suite_id, request.suite_id, request.limit_queries],
    ).fetchall()
    bad_case_count = 0
    for row in bad_case_rows:
        bad_case_suggestion(con, row[0], require_real_llm=request.require_real_llm)
        bad_case_count += 1
    narrative = experiment_narrative(con, request.dataset_id)
    return {
        "assistive_signal": True,
        "dataset_id": request.dataset_id,
        "suite_id": request.suite_id,
        "llm_status": status,
        "rewrite_experiment": rewrite_result["summary"],
        "rag_claim_runs": rag_count,
        "bad_case_suggestion_runs": bad_case_count,
        "narrative": narrative["narrative"],
    }


def llm_runs(con, dataset_id: str | None = None, prompt_type: str | None = None, status: str | None = None, limit: int = 100) -> list[dict]:
    filters = []
    params: list[object] = []
    if dataset_id:
        filters.append("dataset_id = ?")
        params.append(dataset_id)
    if prompt_type:
        filters.append("prompt_type = ?")
        params.append(prompt_type)
    if status:
        filters.append("status = ?")
        params.append(status)
    where = f"WHERE {' AND '.join(filters)}" if filters else ""
    rows = con.execute(
        f"""
        SELECT run_id, dataset_id, prompt_type, provider, model, status, latency_ms, confidence,
               input_summary, output_summary, request_json, response_json, error_json, created_at
        FROM llm_runs
        {where}
        ORDER BY created_at DESC
        LIMIT ?
        """,
        [*params, limit],
    ).fetchall()
    return [serialize_llm_run(row) for row in rows]


def llm_run_detail(con, run_id: str) -> dict:
    row = con.execute(
        """
        SELECT run_id, dataset_id, prompt_type, provider, model, status, latency_ms, confidence,
               input_summary, output_summary, request_json, response_json, error_json, created_at
        FROM llm_runs WHERE run_id = ?
        """,
        [run_id],
    ).fetchone()
    if not row:
        return {"error": "not_found", "run_id": run_id}
    judgments = con.execute(
        """
        SELECT judgment_id, run_id, dataset_id, target_type, target_id, judgment, confidence,
               rationale, evidence_doc_ids_json, review_status, created_at
        FROM llm_judgments WHERE run_id = ? ORDER BY created_at
        """,
        [run_id],
    ).fetchall()
    rewrites = con.execute(
        """
        SELECT rewrite_id, run_id, dataset_id, query_id, rewrite_kind, rewrite_query, baseline_recall,
               rewrite_recall, recall_delta, baseline_ndcg, rewrite_ndcg, ndcg_delta, rank_delta, created_at
        FROM llm_rewrite_runs WHERE run_id = ? ORDER BY created_at
        """,
        [run_id],
    ).fetchall()
    return {
        **serialize_llm_run(row),
        "judgments": [serialize_judgment(item) for item in judgments],
        "rewrites": [serialize_rewrite(item) for item in rewrites],
    }


def llm_dashboard(con, dataset_id: str = "sample_default") -> dict:
    runs = llm_runs(con, dataset_id=dataset_id, limit=500)
    total = len(runs)
    ok_count = sum(1 for run in runs if run["status"] == "ok")
    invalid_count = sum(1 for run in runs if run["status"] == "invalid_output")
    fallback_count = sum(1 for run in runs if run["response"].get("llm_status") == "disconnected")
    failed_count = sum(1 for run in runs if run["status"] not in {"ok", "disconnected"} or run["error"])
    real_count = sum(1 for run in runs if run["status"] == "ok" and run["response"].get("llm_status", "ok") == "ok")
    latencies = [run["latency_ms"] for run in runs if run["latency_ms"] is not None]
    confidences = [run["confidence"] for run in runs if run["confidence"] is not None]

    judgment_rows = con.execute(
        """
        SELECT target_type, judgment, confidence, created_at, target_id
        FROM llm_judgments WHERE dataset_id = ?
        """,
        [dataset_id],
    ).fetchall()
    judgment_by_retriever_rows = con.execute(
        """
        SELECT COALESCE(e.retriever_name, 'rag') AS retriever_name, lj.judgment, count(*)
        FROM llm_judgments lj
        LEFT JOIN bad_cases bc ON lj.target_type = 'bad_case' AND lj.target_id = bc.case_id
        LEFT JOIN experiments e ON bc.experiment_id = e.experiment_id
        WHERE lj.dataset_id = ?
        GROUP BY retriever_name, lj.judgment
        ORDER BY retriever_name, lj.judgment
        """,
        [dataset_id],
    ).fetchall()
    rewrite_rows = con.execute(
        """
        SELECT rewrite_kind, recall_delta, ndcg_delta, rank_delta, created_at
        FROM llm_rewrite_runs WHERE dataset_id = ? AND rewrite_kind <> 'original'
        ORDER BY created_at DESC LIMIT 200
        """,
        [dataset_id],
    ).fetchall()

    claim_distribution = Counter(row[1] for row in judgment_rows if row[0] == "rag_claim")
    root_distribution = Counter(row[1] for row in judgment_rows if row[0] == "bad_case")
    confidence_histogram = histogram([float(row[2]) for row in judgment_rows if row[2] is not None])
    latency_over_time = [
        {"created_at": str(run["created_at"]), "prompt_type": run["prompt_type"], "latency_ms": run["latency_ms"] or 0}
        for run in reversed(runs[:50])
    ]
    slowest_prompts = sorted(
        [{"run_id": run["run_id"], "prompt_type": run["prompt_type"], "latency_ms": run["latency_ms"] or 0, "status": run["status"]} for run in runs],
        key=lambda item: item["latency_ms"],
        reverse=True,
    )[:10]
    rewrite_improvement = [
        {
            "rewrite_kind": row[0],
            "recall_delta": row[1] or 0,
            "ndcg_delta": row[2] or 0,
            "rank_delta": row[3] or 0,
            "created_at": str(row[4]),
        }
        for row in rewrite_rows
    ]
    prompt_groups: dict[str, list[float]] = defaultdict(list)
    for run in runs:
        if run["latency_ms"] is not None:
            prompt_groups[run["prompt_type"]].append(float(run["latency_ms"]))
    prompt_type_latency = [
        {"prompt_type": key, "average_latency_ms": mean(values), "max_latency_ms": max(values), "count": len(values)}
        for key, values in sorted(prompt_groups.items())
    ]
    return {
        "dataset_id": dataset_id,
        "total_runs": total,
        "real_run_count": real_count,
        "fallback_run_count": fallback_count,
        "failed_run_count": failed_count,
        "success_rate": ok_count / total if total else 0,
        "invalid_json_rate": invalid_count / total if total else 0,
        "strict_failure_rate": failed_count / total if total else 0,
        "average_latency_ms": mean(latencies) if latencies else 0,
        "average_confidence": mean(confidences) if confidences else 0,
        "claim_judgment_distribution": dict(claim_distribution),
        "root_cause_distribution": dict(root_distribution),
        "judgment_by_retriever": [
            {"retriever_name": row[0], "judgment": row[1], "count": row[2]}
            for row in judgment_by_retriever_rows
        ],
        "prompt_type_latency": prompt_type_latency,
        "confidence_histogram": confidence_histogram,
        "latency_over_time": latency_over_time,
        "slowest_prompts": slowest_prompts,
        "recent_runs": runs[:20],
        "rewrite_improvement": rewrite_improvement,
    }


def histogram(values: list[float]) -> list[dict]:
    buckets = defaultdict(int)
    for value in values:
        bounded = min(1.0, max(0.0, value))
        bucket = int(bounded * 10) / 10
        buckets[f"{bucket:.1f}-{min(bucket + 0.1, 1.0):.1f}"] += 1
    return [{"bucket": bucket, "count": count} for bucket, count in sorted(buckets.items())]


def serialize_llm_run(row) -> dict:
    return {
        "run_id": row[0],
        "dataset_id": row[1],
        "prompt_type": row[2],
        "provider": row[3],
        "model": row[4],
        "status": row[5],
        "latency_ms": row[6],
        "confidence": row[7],
        "input_summary": row[8],
        "output_summary": row[9],
        "request": safe_json(row[10]),
        "response": safe_json(row[11]),
        "error": safe_json(row[12]),
        "created_at": str(row[13]),
    }


def serialize_judgment(row) -> dict:
    return {
        "judgment_id": row[0],
        "run_id": row[1],
        "dataset_id": row[2],
        "target_type": row[3],
        "target_id": row[4],
        "judgment": row[5],
        "confidence": row[6],
        "rationale": row[7],
        "evidence_doc_ids": safe_json(row[8], []),
        "review_status": row[9],
        "created_at": str(row[10]),
    }


def serialize_rewrite(row) -> dict:
    return {
        "rewrite_id": row[0],
        "run_id": row[1],
        "dataset_id": row[2],
        "query_id": row[3],
        "rewrite_kind": row[4],
        "rewrite_query": row[5],
        "baseline_recall": row[6],
        "rewrite_recall": row[7],
        "recall_delta": row[8],
        "baseline_ndcg": row[9],
        "rewrite_ndcg": row[10],
        "ndcg_delta": row[11],
        "rank_delta": row[12],
        "created_at": str(row[13]),
    }


def safe_json(raw: str | None, fallback=None):
    if not raw:
        return {} if fallback is None else fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {} if fallback is None else fallback
