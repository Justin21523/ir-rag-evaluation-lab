from ir_rag_eval.analytics import correlation_data, insight_summary, pairwise_comparison, query_diagnostics
from ir_rag_eval.corpus.loader import persist_corpus
from ir_rag_eval.corpus.validator import DocumentRecord, QueryRecord
from ir_rag_eval.db.connection import connect
from ir_rag_eval.experiments.persistence import persist_experiment
from ir_rag_eval.experiments.run_persistence import persist_search_run
from ir_rag_eval.analytics import persist_query_metrics
from ir_rag_eval.retrievers.base import SearchResult


def seed_decision_tools(con):
    dataset_id = "decision_tools"
    docs = [
        DocumentRecord(doc_id="d1", title="BM25 guide", text="bm25 lexical search", metadata={"category": "ir"}),
        DocumentRecord(doc_id="d2", title="Dense guide", text="dense semantic retrieval", metadata={"category": "ir"}),
        DocumentRecord(doc_id="d3", title="RAG guide", text="citation grounded rag", metadata={"category": "rag"}),
    ]
    queries = [
        QueryRecord(query_id="q1", query="bm25 lexical", relevant_doc_ids=["d1"]),
        QueryRecord(query_id="q2", query="semantic retrieval", relevant_doc_ids=["d2"]),
    ]
    persist_corpus(con, docs, queries, dataset_id=dataset_id)
    scoped_q1 = f"{dataset_id}::q1"
    scoped_q2 = f"{dataset_id}::q2"
    scoped_d1 = f"{dataset_id}::d1"
    scoped_d2 = f"{dataset_id}::d2"
    scoped_d3 = f"{dataset_id}::d3"
    bm25 = persist_experiment(con, "bm25", "bm25", {"recall@10": 0.5, "ndcg@10": 0.5, "mrr": 0.5, "latency_ms": 2, "zero_result_rate": 0}, {}, dataset_id)
    dense = persist_experiment(con, "dense", "dense", {"recall@10": 1.0, "ndcg@10": 1.0, "mrr": 1.0, "latency_ms": 3, "zero_result_rate": 0}, {}, dataset_id)
    bm25_details = [
        {"query": QueryRecord(query_id=scoped_q1, query="bm25 lexical", relevant_doc_ids=[scoped_d1]), "retrieved_doc_ids": [scoped_d1, scoped_d3], "relevant_doc_ids": [scoped_d1], "latency_ms": 2.0, "results": []},
        {"query": QueryRecord(query_id=scoped_q2, query="semantic retrieval", relevant_doc_ids=[scoped_d2]), "retrieved_doc_ids": [scoped_d3, scoped_d1], "relevant_doc_ids": [scoped_d2], "latency_ms": 2.0, "results": []},
    ]
    dense_details = [
        {"query": QueryRecord(query_id=scoped_q1, query="bm25 lexical", relevant_doc_ids=[scoped_d1]), "retrieved_doc_ids": [scoped_d1, scoped_d3], "relevant_doc_ids": [scoped_d1], "latency_ms": 3.0, "results": []},
        {"query": QueryRecord(query_id=scoped_q2, query="semantic retrieval", relevant_doc_ids=[scoped_d2]), "retrieved_doc_ids": [scoped_d2, scoped_d3], "relevant_doc_ids": [scoped_d2], "latency_ms": 3.0, "results": []},
    ]
    persist_query_metrics(con, dataset_id, bm25, "bm25", bm25_details, [10])
    persist_query_metrics(con, dataset_id, dense, "dense", dense_details, [10])
    for exp_id, name, rows in [
        (bm25, "bm25", [(scoped_q1, [scoped_d1, scoped_d3]), (scoped_q2, [scoped_d3, scoped_d1])]),
        (dense, "dense", [(scoped_q1, [scoped_d1, scoped_d3]), (scoped_q2, [scoped_d2, scoped_d3])]),
    ]:
        for query_id, doc_ids in rows:
            persist_search_run(
                con,
                name,
                query_id,
                [SearchResult(doc_id=doc_id, title=doc_id, text="", score=1 / rank, rank=rank, score_breakdown={name: 1 / rank}) for rank, doc_id in enumerate(doc_ids, start=1)],
                1.0,
                {},
                experiment_id=exp_id,
                dataset_id=dataset_id,
            )
    return dataset_id, bm25, dense, scoped_q2


def test_query_diagnostics_pairwise_correlations_and_insights(tmp_path):
    with connect(tmp_path / "decision.duckdb") as con:
        dataset_id, bm25, dense, q2 = seed_decision_tools(con)
        diagnostics = query_diagnostics(con, dataset_id, q2, [bm25, dense], 10)
        comparison = pairwise_comparison(con, dataset_id, dense, bm25, 10)
        correlations = correlation_data(con, dataset_id, 10)
        insights = insight_summary(con, dataset_id)

    assert diagnostics["query"]["query_id"] == q2
    assert diagnostics["experiments"][0]["missed_relevant_doc_ids"]
    assert comparison["summary"]["wins"] == 1
    assert comparison["queries"][1]["left_only_relevant_doc_ids"]
    assert correlations["query_length_failure"]
    assert insights["dense_beats_bm25_queries"]
