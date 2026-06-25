def citation_coverage(cited_doc_ids: list[str], evidence_doc_ids: list[str]) -> float:
    if not evidence_doc_ids:
        return 0.0
    return len(set(cited_doc_ids) & set(evidence_doc_ids)) / len(set(evidence_doc_ids))


def unsupported_claims(answer_text: str, cited_doc_ids: list[str]) -> list[str]:
    if not answer_text.strip():
        return []
    if not cited_doc_ids:
        return ["Answer has no citations."]
    return []
