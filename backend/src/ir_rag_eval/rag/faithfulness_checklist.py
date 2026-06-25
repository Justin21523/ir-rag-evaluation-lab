def checklist(citation_coverage_value: float, unsupported_claims: list[str]) -> list[dict]:
    return [
        {"id": "has_citations", "passed": citation_coverage_value > 0, "label": "Answer includes citations"},
        {"id": "all_evidence_cited", "passed": citation_coverage_value >= 1.0, "label": "Retrieved evidence is cited"},
        {"id": "unsupported_claims", "passed": not unsupported_claims, "label": "No unsupported claims flagged"},
    ]
