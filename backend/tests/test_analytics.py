from ir_rag_eval.analytics import analytics_overview, dataset_profile, persist_query_metrics, query_metrics
from ir_rag_eval.corpus.loader import persist_corpus
from ir_rag_eval.corpus.validator import DocumentRecord, QueryRecord
from ir_rag_eval.db.connection import connect
from ir_rag_eval.experiments.persistence import persist_experiment


def test_persist_query_metrics_and_profile(tmp_path):
    dataset_id = "analytics_test"
    documents = [
        DocumentRecord(doc_id="d1", title="BM25", text="bm25 lexical retrieval baseline", metadata={"category": "ir", "year": 2025}),
        DocumentRecord(doc_id="d2", title="RAG", text="rag citation grounding evaluation", metadata={"category": "rag", "year": 2026}),
    ]
    queries = [QueryRecord(query_id="q1", query="bm25 baseline", relevant_doc_ids=["d1"])]
    with connect(tmp_path / "analytics.duckdb") as con:
        persist_corpus(con, documents, queries, dataset_id=dataset_id)
        experiment_id = persist_experiment(
            con,
            "analytics test",
            "bm25",
            {"recall@10": 1.0, "ndcg@10": 1.0, "mrr": 1.0, "latency_ms": 3.0, "zero_result_rate": 0.0},
            {"k_values": [1, 10]},
            dataset_id=dataset_id,
        )
        persist_query_metrics(
            con,
            dataset_id,
            experiment_id,
            "bm25",
            [
                {
                    "query": QueryRecord(query_id=f"{dataset_id}::q1", query="bm25 baseline", relevant_doc_ids=[f"{dataset_id}::d1"]),
                    "retrieved_doc_ids": [f"{dataset_id}::d1", f"{dataset_id}::d2"],
                    "relevant_doc_ids": [f"{dataset_id}::d1"],
                    "latency_ms": 3.0,
                    "results": [],
                }
            ],
            [1, 10],
        )
        overview = analytics_overview(con, dataset_id)
        rows = query_metrics(con, dataset_id, experiment_id)
        profile = dataset_profile(con, dataset_id)

    assert overview["leaderboard"][0]["retriever_name"] == "bm25"
    assert overview["curves"]["recall"]
    assert rows[0]["difficulty_label"] == "easy"
    assert profile["document_lengths"]
    assert {row["name"] for row in profile["metadata_treemap"]} == {"ir", "rag"}
