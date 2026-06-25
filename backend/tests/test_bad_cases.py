from ir_rag_eval.evaluation.bad_cases import classify_bad_case


def test_bad_case_zero_result():
    assert classify_bad_case([], ["d1"]) == "zero_result"


def test_bad_case_no_relevant():
    assert classify_bad_case(["d2"], ["d1"]) == "no_relevant_documents_retrieved"
