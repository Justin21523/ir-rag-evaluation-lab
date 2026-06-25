import json
from collections import Counter, defaultdict
from uuid import uuid4

from ir_rag_eval.evaluation.bad_cases import classify_bad_case
from ir_rag_eval.evaluation.metrics import average_precision, ndcg_at_k, precision_at_k, recall_at_k, reciprocal_rank
from ir_rag_eval.utils.text import tokenize


def first_relevant_rank(retrieved: list[str], relevant: set[str]) -> int | None:
    return next((idx for idx, doc_id in enumerate(retrieved, start=1) if doc_id in relevant), None)


def query_difficulty(first_rank: int | None, recall10: float) -> str:
    if first_rank is None or recall10 <= 0:
        return "failed"
    if first_rank <= 3 and recall10 >= 0.5:
        return "easy"
    if first_rank <= 10:
        return "medium"
    return "hard"


def persist_query_metrics(con, dataset_id: str, experiment_id: str, retriever_name: str, details: list[dict], k_values: list[int]) -> None:
    con.execute("DELETE FROM query_metrics WHERE experiment_id = ?", [experiment_id])
    max_k = max(k_values or [10])
    for detail in details:
        query = detail["query"]
        retrieved = detail["retrieved_doc_ids"]
        relevant = set(detail["relevant_doc_ids"])
        first_rank = first_relevant_rank(retrieved, relevant)
        bad_case = classify_bad_case(retrieved, list(relevant), detail["latency_ms"], k=max_k) or ""
        rr = reciprocal_rank(retrieved, relevant)
        ap = average_precision(retrieved, relevant)
        difficulty = query_difficulty(first_rank, recall_at_k(retrieved, relevant, max_k))
        for k in k_values:
            con.execute(
                """
                INSERT INTO query_metrics
                (metric_id, dataset_id, experiment_id, retriever_name, query_id, k, precision, recall, ndcg,
                 reciprocal_rank, average_precision, first_relevant_rank, retrieved_count, latency_ms,
                 bad_case_type, difficulty_label)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    f"qm_{uuid4().hex[:10]}",
                    dataset_id,
                    experiment_id,
                    retriever_name,
                    query.query_id,
                    k,
                    precision_at_k(retrieved, relevant, k),
                    recall_at_k(retrieved, relevant, k),
                    ndcg_at_k(retrieved, relevant, k),
                    rr,
                    ap,
                    first_rank,
                    len(retrieved),
                    detail["latency_ms"],
                    bad_case,
                    difficulty,
                ],
            )


def analytics_overview(con, dataset_id: str) -> dict:
    leaderboard_rows = con.execute(
        """
        SELECT e.experiment_id, e.retriever_name,
               max(CASE WHEN m.metric_name='recall@10' THEN m.value END) AS recall10,
               max(CASE WHEN m.metric_name='ndcg@10' THEN m.value END) AS ndcg10,
               max(CASE WHEN m.metric_name='mrr' THEN m.value END) AS mrr,
               max(CASE WHEN m.metric_name='latency_ms' THEN m.value END) AS latency_ms,
               max(CASE WHEN m.metric_name='zero_result_rate' THEN m.value END) AS zero_result_rate
        FROM experiments e
        LEFT JOIN metrics m ON e.experiment_id = m.experiment_id
        WHERE e.dataset_id = ?
        GROUP BY e.experiment_id, e.retriever_name
        ORDER BY recall10 DESC NULLS LAST, ndcg10 DESC NULLS LAST
        """,
        [dataset_id],
    ).fetchall()
    leaderboard = [
        {
            "experiment_id": row[0],
            "retriever_name": row[1],
            "recall@10": row[2] or 0,
            "ndcg@10": row[3] or 0,
            "mrr": row[4] or 0,
            "latency_ms": row[5] or 0,
            "zero_result_rate": row[6] or 0,
        }
        for row in leaderboard_rows
    ]
    curve_rows = con.execute(
        """
        SELECT retriever_name, k, avg(recall), avg(ndcg), avg(precision)
        FROM query_metrics WHERE dataset_id = ?
        GROUP BY retriever_name, k ORDER BY retriever_name, k
        """,
        [dataset_id],
    ).fetchall()
    difficulty_rows = con.execute(
        "SELECT difficulty_label, count(DISTINCT query_id) FROM query_metrics WHERE dataset_id = ? GROUP BY difficulty_label",
        [dataset_id],
    ).fetchall()
    max_k_filter = """
        dataset_id = ?
        AND k = (
            SELECT max(k) FROM query_metrics qm2
            WHERE qm2.dataset_id = query_metrics.dataset_id
              AND qm2.experiment_id = query_metrics.experiment_id
        )
    """
    bad_case_rows = con.execute(
        f"SELECT COALESCE(NULLIF(bad_case_type,''),'none'), count(*) FROM query_metrics WHERE {max_k_filter} GROUP BY bad_case_type",
        [dataset_id],
    ).fetchall()
    rank_rows = con.execute(
        f"SELECT first_relevant_rank, count(*) FROM query_metrics WHERE {max_k_filter} GROUP BY first_relevant_rank ORDER BY first_relevant_rank",
        [dataset_id],
    ).fetchall()
    scatter_rows = con.execute(
        f"SELECT retriever_name, query_id, latency_ms, recall FROM query_metrics WHERE {max_k_filter} LIMIT 1000",
        [dataset_id],
    ).fetchall()
    return {
        "dataset_id": dataset_id,
        "leaderboard": leaderboard,
        "curves": {
            "recall": [{"retriever_name": row[0], "k": row[1], "value": row[2] or 0} for row in curve_rows],
            "ndcg": [{"retriever_name": row[0], "k": row[1], "value": row[3] or 0} for row in curve_rows],
            "precision": [{"retriever_name": row[0], "k": row[1], "value": row[4] or 0} for row in curve_rows],
        },
        "difficulty": [{"difficulty_label": row[0] or "unknown", "query_count": row[1]} for row in difficulty_rows],
        "bad_cases": [{"case_type": row[0], "count": row[1]} for row in bad_case_rows],
        "rank_histogram": [{"rank": row[0] or 0, "count": row[1]} for row in rank_rows],
        "latency_recall": [{"retriever_name": row[0], "query_id": row[1], "latency_ms": row[2], "recall": row[3]} for row in scatter_rows],
    }


def query_metrics(con, dataset_id: str, experiment_id: str | None = None) -> list[dict]:
    params = [dataset_id]
    where = "dataset_id = ?"
    if experiment_id:
        where += " AND experiment_id = ?"
        params.append(experiment_id)
    rows = con.execute(
        f"""
        SELECT experiment_id, retriever_name, query_id, k, precision, recall, ndcg, reciprocal_rank,
               average_precision, first_relevant_rank, retrieved_count, latency_ms, bad_case_type, difficulty_label
        FROM query_metrics WHERE {where}
        ORDER BY query_id, retriever_name, k
        """,
        params,
    ).fetchall()
    return [
        {
            "experiment_id": row[0],
            "retriever_name": row[1],
            "query_id": row[2],
            "k": row[3],
            "precision": row[4],
            "recall": row[5],
            "ndcg": row[6],
            "reciprocal_rank": row[7],
            "average_precision": row[8],
            "first_relevant_rank": row[9],
            "retrieved_count": row[10],
            "latency_ms": row[11],
            "bad_case_type": row[12],
            "difficulty_label": row[13],
        }
        for row in rows
    ]


def dataset_profile(con, dataset_id: str) -> dict:
    doc_rows = con.execute("SELECT text, metadata_json FROM documents WHERE dataset_id = ?", [dataset_id]).fetchall()
    query_rows = con.execute("SELECT query, relevant_doc_ids_json FROM queries WHERE dataset_id = ?", [dataset_id]).fetchall()
    doc_lengths = [len(tokenize(row[0] or "")) for row in doc_rows]
    query_lengths = [len(tokenize(row[0] or "")) for row in query_rows]
    categories = Counter()
    years = Counter()
    for _text, metadata_json in doc_rows:
        metadata = json.loads(metadata_json or "{}")
        categories[str(metadata.get("category") or metadata.get("source") or "unknown")] += 1
        if metadata.get("year") or metadata.get("publication_year"):
            years[str(metadata.get("year") or metadata.get("publication_year"))] += 1
    label_counts = [len(json.loads(row[1] or "[]")) for row in query_rows]
    return {
        "dataset_id": dataset_id,
        "document_lengths": histogram(doc_lengths),
        "query_lengths": histogram(query_lengths),
        "metadata_treemap": [{"name": key, "value": value} for key, value in categories.items()],
        "year_distribution": [{"year": key, "count": value} for key, value in sorted(years.items())],
        "label_density": histogram(label_counts),
    }


def histogram(values: list[int], bucket_size: int = 10) -> list[dict]:
    buckets = defaultdict(int)
    for value in values:
        bucket = (value // bucket_size) * bucket_size
        buckets[bucket] += 1
    return [{"bucket": key, "count": buckets[key]} for key in sorted(buckets)]
