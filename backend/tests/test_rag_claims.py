from ir_rag_eval.rag.claims import evaluate_claims, extract_citations, split_claims


def test_claim_evaluation_matches_citations_to_evidence():
    answer = "This is supported [doc_001]. This is missing."
    assert extract_citations(answer) == ["doc_001"]
    assert len(split_claims(answer)) == 2
    claims = evaluate_claims(answer, ["doc_001"])
    assert claims[0]["supported"] is True
    assert claims[1]["supported"] is False
