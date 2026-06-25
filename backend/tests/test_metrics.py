from ir_rag_eval.evaluation.metrics import average_precision, ndcg_at_k, precision_at_k, recall_at_k, reciprocal_rank


def test_retrieval_metrics():
    retrieved = ["d2", "d1", "d3"]
    relevant = {"d1", "d3"}
    assert precision_at_k(retrieved, relevant, 2) == 0.5
    assert recall_at_k(retrieved, relevant, 3) == 1.0
    assert reciprocal_rank(retrieved, relevant) == 0.5
    assert round(average_precision(retrieved, relevant), 4) == 0.5833
    assert ndcg_at_k(retrieved, relevant, 3) > 0
