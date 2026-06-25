from ir_rag_eval.evaluation.citation_checker import citation_coverage, unsupported_claims
from ir_rag_eval.rag.claims import evaluate_claims


def evaluate_answer(answer_text: str, cited_doc_ids: list[str], evidence_doc_ids: list[str]) -> dict:
    coverage = citation_coverage(cited_doc_ids, evidence_doc_ids)
    claims = evaluate_claims(answer_text, evidence_doc_ids)
    unsupported = [claim["text"] for claim in claims if not claim["supported"]]
    notes = unsupported or unsupported_claims(answer_text, cited_doc_ids)
    support_rate = (
        sum(1 for claim in claims if claim["supported"]) / len(claims)
        if claims
        else coverage
    )
    return {
        "citation_coverage": coverage,
        "answer_support_rate": support_rate,
        "retrieved_context_relevance": 1.0 if evidence_doc_ids else 0.0,
        "unsupported_claims": notes,
        "claims": claims,
    }
