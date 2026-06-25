import json
from datetime import UTC, datetime
from uuid import uuid4

from ir_rag_eval.evaluation.bad_cases import bad_case_description, classify_bad_case, classify_retrieval_pair
from ir_rag_eval.experiments.registry import build_retriever


def persist_bad_case(con, experiment_id: str, query_id: str, case_type: str, description: str, expected: list[str], retrieved: list[str]) -> str:
    case_id = f"case_{uuid4().hex[:10]}"
    con.execute(
        """
        INSERT INTO bad_cases
        (case_id, experiment_id, query_id, case_type, description, expected_doc_ids_json, retrieved_doc_ids_json, notes, reviewer_label, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            case_id,
            experiment_id,
            query_id,
            case_type,
            description,
            json.dumps(expected),
            json.dumps(retrieved),
            "",
            "needs_review",
            datetime.now(UTC),
        ],
    )
    return case_id


def generate_bad_cases(con, experiment_id: str, details: list[dict], documents, k: int = 10) -> list[str]:
    generated: list[str] = []
    bm25 = build_retriever("bm25", documents)
    dense = build_retriever("dense", documents)
    for detail in details:
        query = detail["query"]
        retrieved = detail["retrieved_doc_ids"]
        relevant = detail["relevant_doc_ids"]
        case_type = classify_bad_case(retrieved, relevant, detail["latency_ms"], k=k)
        if case_type:
            generated.append(
                persist_bad_case(
                    con,
                    experiment_id,
                    query.query_id,
                    case_type,
                    bad_case_description(case_type, query.query_id),
                    relevant,
                    retrieved,
                )
            )
        bm25_ids = [r.doc_id for r in bm25.search(query.query, k=k)]
        dense_ids = [r.doc_id for r in dense.search(query.query, k=k)]
        disagreement = classify_retrieval_pair(bm25_ids, dense_ids, relevant, k=k)
        if disagreement:
            generated.append(
                persist_bad_case(
                    con,
                    experiment_id,
                    query.query_id,
                    disagreement,
                    bad_case_description(disagreement, query.query_id),
                    relevant,
                    retrieved,
                )
            )
    return generated
