from ir_rag_eval.evaluation.citation_checker import citation_coverage, unsupported_claims


def test_citation_coverage():
    assert citation_coverage(["d1"], ["d1", "d2"]) == 0.5
    assert unsupported_claims("answer", []) == ["Answer has no citations."]
