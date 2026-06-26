import json
from collections import Counter, defaultdict
from statistics import mean, pvariance
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


def scoped_experiment_ids(con, dataset_id: str, suite_id: str | None = None, latest_per_retriever: bool = True) -> list[str]:
    if suite_id:
        rows = con.execute(
            """
            SELECT experiment_id FROM experiments
            WHERE dataset_id = ? AND suite_id = ? AND status = 'completed'
            ORDER BY started_at DESC
            """,
            [dataset_id, suite_id],
        ).fetchall()
        return [row[0] for row in rows]
    if latest_per_retriever:
        return latest_experiment_ids_by_retriever(con, dataset_id)
    rows = con.execute(
        """
        SELECT experiment_id FROM experiments
        WHERE dataset_id = ? AND status = 'completed'
        ORDER BY started_at DESC
        """,
        [dataset_id],
    ).fetchall()
    return [row[0] for row in rows]


def id_filter_sql(ids: list[str], alias: str = "") -> tuple[str, list[str]]:
    if not ids:
        return "1=0", []
    prefix = f"{alias}." if alias else ""
    return f"{prefix}experiment_id IN ({','.join(['?'] * len(ids))})", ids


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


def analytics_overview(con, dataset_id: str, suite_id: str | None = None) -> dict:
    experiment_ids = scoped_experiment_ids(con, dataset_id, suite_id)
    exp_filter, exp_params = id_filter_sql(experiment_ids, "e")
    metric_filter, metric_params = id_filter_sql(experiment_ids)
    leaderboard_rows = con.execute(
        f"""
        SELECT e.experiment_id, e.retriever_name,
               max(CASE WHEN m.metric_name='recall@10' THEN m.value END) AS recall10,
               max(CASE WHEN m.metric_name='ndcg@10' THEN m.value END) AS ndcg10,
               max(CASE WHEN m.metric_name='mrr' THEN m.value END) AS mrr,
               max(CASE WHEN m.metric_name='latency_ms' THEN m.value END) AS latency_ms,
               max(CASE WHEN m.metric_name='zero_result_rate' THEN m.value END) AS zero_result_rate
        FROM experiments e
        LEFT JOIN metrics m ON e.experiment_id = m.experiment_id
        WHERE e.dataset_id = ? AND {exp_filter}
        GROUP BY e.experiment_id, e.retriever_name
        ORDER BY recall10 DESC NULLS LAST, ndcg10 DESC NULLS LAST
        """,
        [dataset_id, *exp_params],
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
        f"""
        SELECT retriever_name, k, avg(recall), avg(ndcg), avg(precision)
        FROM query_metrics WHERE dataset_id = ? AND {metric_filter}
        GROUP BY retriever_name, k ORDER BY retriever_name, k
        """,
        [dataset_id, *metric_params],
    ).fetchall()
    difficulty_rows = con.execute(
        f"SELECT difficulty_label, count(DISTINCT query_id) FROM query_metrics WHERE dataset_id = ? AND {metric_filter} GROUP BY difficulty_label",
        [dataset_id, *metric_params],
    ).fetchall()
    max_k_filter = f"""
        dataset_id = ?
        AND {metric_filter}
        AND k = (
            SELECT max(k) FROM query_metrics qm2
            WHERE qm2.dataset_id = query_metrics.dataset_id
              AND qm2.experiment_id = query_metrics.experiment_id
        )
    """
    bad_case_rows = con.execute(
        f"SELECT COALESCE(NULLIF(bad_case_type,''),'none'), count(*) FROM query_metrics WHERE {max_k_filter} GROUP BY bad_case_type",
        [dataset_id, *metric_params],
    ).fetchall()
    rank_rows = con.execute(
        f"SELECT first_relevant_rank, count(*) FROM query_metrics WHERE {max_k_filter} GROUP BY first_relevant_rank ORDER BY first_relevant_rank",
        [dataset_id, *metric_params],
    ).fetchall()
    scatter_rows = con.execute(
        f"SELECT retriever_name, query_id, latency_ms, recall FROM query_metrics WHERE {max_k_filter} LIMIT 1000",
        [dataset_id, *metric_params],
    ).fetchall()
    return {
        "dataset_id": dataset_id,
        "suite_id": suite_id,
        "experiment_ids": experiment_ids,
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


def query_metrics(con, dataset_id: str, experiment_id: str | None = None, suite_id: str | None = None, latest_per_retriever: bool = True) -> list[dict]:
    params = [dataset_id]
    where = "dataset_id = ?"
    if experiment_id:
        where += " AND experiment_id = ?"
        params.append(experiment_id)
    else:
        experiment_ids = scoped_experiment_ids(con, dataset_id, suite_id, latest_per_retriever)
        exp_filter, exp_params = id_filter_sql(experiment_ids)
        where += f" AND {exp_filter}"
        params.extend(exp_params)
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


def latest_experiment_ids_by_retriever(con, dataset_id: str) -> list[str]:
    rows = con.execute(
        """
        SELECT experiment_id, retriever_name
        FROM experiments
        WHERE dataset_id = ? AND status = 'completed'
        ORDER BY started_at DESC
        """,
        [dataset_id],
    ).fetchall()
    seen = set()
    ids = []
    for experiment_id, retriever_name in rows:
        if retriever_name not in seen:
            seen.add(retriever_name)
            ids.append(experiment_id)
    return ids


def effective_k(con, experiment_id: str, requested_k: int) -> int:
    row = con.execute("SELECT k FROM query_metrics WHERE experiment_id = ? AND k = ? LIMIT 1", [experiment_id, requested_k]).fetchone()
    if row:
        return requested_k
    row = con.execute("SELECT max(k) FROM query_metrics WHERE experiment_id = ?", [experiment_id]).fetchone()
    return int(row[0] or requested_k)


def _doc_map(con, doc_ids: list[str]) -> dict[str, dict]:
    if not doc_ids:
        return {}
    placeholders = ",".join(["?"] * len(doc_ids))
    rows = con.execute(
        f"SELECT doc_id, title, text, metadata_json FROM documents WHERE doc_id IN ({placeholders})",
        doc_ids,
    ).fetchall()
    return {
        row[0]: {"doc_id": row[0], "title": row[1], "text": row[2], "metadata": json.loads(row[3] or "{}")}
        for row in rows
    }


def _query_row(con, dataset_id: str, query_id: str) -> dict:
    row = con.execute(
        "SELECT query_id, query, relevant_doc_ids_json, metadata_json FROM queries WHERE dataset_id = ? AND query_id = ?",
        [dataset_id, query_id],
    ).fetchone()
    if not row:
        return {"query_id": query_id, "query": "", "relevant_doc_ids": [], "metadata": {}}
    return {"query_id": row[0], "query": row[1], "relevant_doc_ids": json.loads(row[2] or "[]"), "metadata": json.loads(row[3] or "{}")}


def _ranking(con, dataset_id: str, experiment_id: str, query_id: str, k: int, relevant: set[str]) -> list[dict]:
    rows = con.execute(
        """
        SELECT sr.doc_id, d.title, d.text, sr.rank, sr.score, sr.score_breakdown_json
        FROM search_results sr
        LEFT JOIN documents d ON sr.doc_id = d.doc_id
        WHERE sr.dataset_id = ? AND sr.experiment_id = ? AND sr.query_id = ? AND sr.rank <= ?
        ORDER BY sr.rank
        """,
        [dataset_id, experiment_id, query_id, k],
    ).fetchall()
    return [
        {
            "doc_id": row[0],
            "title": row[1] or row[0],
            "text": row[2] or "",
            "rank": row[3],
            "score": row[4],
            "score_breakdown": json.loads(row[5] or "{}"),
            "is_relevant": row[0] in relevant,
        }
        for row in rows
    ]


def query_diagnostics(con, dataset_id: str, query_id: str, experiment_ids: list[str] | None = None, k: int = 10) -> dict:
    selected_ids = experiment_ids or latest_experiment_ids_by_retriever(con, dataset_id)
    query = _query_row(con, dataset_id, query_id)
    relevant = set(query["relevant_doc_ids"])
    relevant_docs = _doc_map(con, list(relevant))
    experiments = []
    for experiment_id in selected_ids:
        exp = con.execute(
            "SELECT experiment_id, retriever_name, name FROM experiments WHERE experiment_id = ?",
            [experiment_id],
        ).fetchone()
        if not exp:
            continue
        use_k = effective_k(con, experiment_id, k)
        metric = con.execute(
            """
            SELECT precision, recall, ndcg, reciprocal_rank, average_precision, first_relevant_rank,
                   retrieved_count, latency_ms, bad_case_type, difficulty_label
            FROM query_metrics
            WHERE dataset_id = ? AND experiment_id = ? AND query_id = ? AND k = ?
            """,
            [dataset_id, experiment_id, query_id, use_k],
        ).fetchone()
        ranking = _ranking(con, dataset_id, experiment_id, query_id, use_k, relevant)
        retrieved_ids = {item["doc_id"] for item in ranking}
        llm_row = con.execute(
            """
            SELECT case_id, case_type, llm_suggestion_json, llm_review_status
            FROM bad_cases
            WHERE experiment_id = ? AND query_id = ? AND llm_suggestion_json IS NOT NULL
            ORDER BY llm_updated_at DESC NULLS LAST, updated_at DESC
            LIMIT 1
            """,
            [experiment_id, query_id],
        ).fetchone()
        llm_diagnosis = None
        if llm_row:
            llm_diagnosis = {
                "case_id": llm_row[0],
                "case_type": llm_row[1],
                "review_status": llm_row[3],
                "suggestion": json.loads(llm_row[2] or "{}"),
            }
        experiments.append(
            {
                "experiment_id": exp[0],
                "retriever_name": exp[1],
                "name": exp[2],
                "k": use_k,
                "metrics": {
                    "precision": metric[0] if metric else 0,
                    "recall": metric[1] if metric else 0,
                    "ndcg": metric[2] if metric else 0,
                    "reciprocal_rank": metric[3] if metric else 0,
                    "average_precision": metric[4] if metric else 0,
                    "first_relevant_rank": metric[5] if metric else None,
                    "retrieved_count": metric[6] if metric else len(ranking),
                    "latency_ms": metric[7] if metric else 0,
                    "bad_case_type": metric[8] if metric else "",
                    "difficulty_label": metric[9] if metric else "unknown",
                },
                "ranking": ranking,
                "missed_relevant_doc_ids": sorted(relevant - retrieved_ids),
                "llm_diagnosis": llm_diagnosis,
            }
        )
    return {"dataset_id": dataset_id, "query": query, "relevant_docs": list(relevant_docs.values()), "experiments": experiments}


def _metrics_for_experiment(con, dataset_id: str, experiment_id: str, k: int) -> dict[str, dict]:
    use_k = effective_k(con, experiment_id, k)
    rows = con.execute(
        """
        SELECT query_id, precision, recall, ndcg, reciprocal_rank, first_relevant_rank, latency_ms,
               bad_case_type, difficulty_label
        FROM query_metrics
        WHERE dataset_id = ? AND experiment_id = ? AND k = ?
        """,
        [dataset_id, experiment_id, use_k],
    ).fetchall()
    return {
        row[0]: {
            "query_id": row[0],
            "k": use_k,
            "precision": row[1],
            "recall": row[2],
            "ndcg": row[3],
            "reciprocal_rank": row[4],
            "first_relevant_rank": row[5],
            "latency_ms": row[6],
            "bad_case_type": row[7] or "",
            "difficulty_label": row[8] or "unknown",
        }
        for row in rows
    }


def _top_doc_ids(con, dataset_id: str, experiment_id: str, query_id: str, k: int) -> list[str]:
    rows = con.execute(
        """
        SELECT doc_id FROM search_results
        WHERE dataset_id = ? AND experiment_id = ? AND query_id = ? AND rank <= ?
        ORDER BY rank
        """,
        [dataset_id, experiment_id, query_id, k],
    ).fetchall()
    return [row[0] for row in rows]


def pairwise_comparison(con, dataset_id: str, left_experiment_id: str, right_experiment_id: str, k: int = 10) -> dict:
    left = _metrics_for_experiment(con, dataset_id, left_experiment_id, k)
    right = _metrics_for_experiment(con, dataset_id, right_experiment_id, k)
    left_exp = con.execute("SELECT retriever_name, name FROM experiments WHERE experiment_id = ?", [left_experiment_id]).fetchone()
    right_exp = con.execute("SELECT retriever_name, name FROM experiments WHERE experiment_id = ?", [right_experiment_id]).fetchone()
    common = sorted(set(left) & set(right))
    summary = {"wins": 0, "losses": 0, "ties": 0, "avg_recall_delta": 0.0, "avg_ndcg_delta": 0.0, "avg_latency_delta_ms": 0.0}
    rows = []
    recall_deltas = []
    ndcg_deltas = []
    latency_deltas = []
    for query_id in common:
        query = _query_row(con, dataset_id, query_id)
        relevant = set(query["relevant_doc_ids"])
        l_metric = left[query_id]
        r_metric = right[query_id]
        left_tuple = (l_metric["recall"], l_metric["ndcg"], l_metric["reciprocal_rank"])
        right_tuple = (r_metric["recall"], r_metric["ndcg"], r_metric["reciprocal_rank"])
        outcome = "tie"
        if left_tuple > right_tuple:
            outcome = "win"
            summary["wins"] += 1
        elif left_tuple < right_tuple:
            outcome = "loss"
            summary["losses"] += 1
        else:
            summary["ties"] += 1
        use_k = min(l_metric["k"], r_metric["k"])
        left_hits = set(_top_doc_ids(con, dataset_id, left_experiment_id, query_id, use_k)) & relevant
        right_hits = set(_top_doc_ids(con, dataset_id, right_experiment_id, query_id, use_k)) & relevant
        recall_delta = l_metric["recall"] - r_metric["recall"]
        ndcg_delta = l_metric["ndcg"] - r_metric["ndcg"]
        latency_delta = l_metric["latency_ms"] - r_metric["latency_ms"]
        recall_deltas.append(recall_delta)
        ndcg_deltas.append(ndcg_delta)
        latency_deltas.append(latency_delta)
        rows.append(
            {
                "query_id": query_id,
                "query": query["query"],
                "outcome": outcome,
                "recall_delta": recall_delta,
                "ndcg_delta": ndcg_delta,
                "latency_delta_ms": latency_delta,
                "rank_delta": (l_metric["first_relevant_rank"] or 9999) - (r_metric["first_relevant_rank"] or 9999),
                "left_only_relevant_doc_ids": sorted(left_hits - right_hits),
                "right_only_relevant_doc_ids": sorted(right_hits - left_hits),
                "left": l_metric,
                "right": r_metric,
            }
        )
    if common:
        summary["avg_recall_delta"] = mean(recall_deltas)
        summary["avg_ndcg_delta"] = mean(ndcg_deltas)
        summary["avg_latency_delta_ms"] = mean(latency_deltas)
    return {
        "dataset_id": dataset_id,
        "left": {"experiment_id": left_experiment_id, "retriever_name": left_exp[0] if left_exp else "", "name": left_exp[1] if left_exp else ""},
        "right": {"experiment_id": right_experiment_id, "retriever_name": right_exp[0] if right_exp else "", "name": right_exp[1] if right_exp else ""},
        "summary": summary,
        "hybrid_summary": {
            "left_is_hybrid": bool(left_exp and left_exp[0] == "hybrid"),
            "right_is_hybrid": bool(right_exp and right_exp[0] == "hybrid"),
            "hybrid_uplift_queries": summary["wins"] if left_exp and left_exp[0] == "hybrid" else summary["losses"] if right_exp and right_exp[0] == "hybrid" else 0,
        },
        "queries": rows,
    }


def correlation_data(con, dataset_id: str, k: int = 10, suite_id: str | None = None) -> dict:
    metrics = query_metrics(con, dataset_id, suite_id=suite_id)
    max_rows = [row for row in metrics if row["k"] == k]
    if not max_rows:
        by_exp_max = {}
        for row in metrics:
            by_exp_max[row["experiment_id"]] = max(by_exp_max.get(row["experiment_id"], 0), row["k"])
        max_rows = [row for row in metrics if row["k"] == by_exp_max.get(row["experiment_id"])]
    query_rows = con.execute("SELECT query_id, query, relevant_doc_ids_json FROM queries WHERE dataset_id = ?", [dataset_id]).fetchall()
    query_meta = {
        row[0]: {"query": row[1], "query_length": len(tokenize(row[1] or "")), "label_count": len(json.loads(row[2] or "[]"))}
        for row in query_rows
    }
    retriever_groups = defaultdict(list)
    for row in max_rows:
        retriever_groups[row["retriever_name"]].append(row)
    return {
        "dataset_id": dataset_id,
        "suite_id": suite_id,
        "recall_latency": [
            {"retriever_name": row["retriever_name"], "query_id": row["query_id"], "recall": row["recall"], "latency_ms": row["latency_ms"]}
            for row in max_rows
        ],
        "ndcg_zero_result": [
            {
                "retriever_name": retriever,
                "ndcg": mean([row["ndcg"] for row in rows]) if rows else 0,
                "zero_result_rate": sum(1 for row in rows if row["retrieved_count"] == 0) / len(rows) if rows else 0,
            }
            for retriever, rows in retriever_groups.items()
        ],
        "query_length_failure": [
            {
                "query_id": row["query_id"],
                "retriever_name": row["retriever_name"],
                "query_length": query_meta.get(row["query_id"], {}).get("query_length", 0),
                "failed": 1 if row["bad_case_type"] else 0,
            }
            for row in max_rows
        ],
        "label_count_recall": [
            {
                "query_id": row["query_id"],
                "retriever_name": row["retriever_name"],
                "label_count": query_meta.get(row["query_id"], {}).get("label_count", 0),
                "recall": row["recall"],
            }
            for row in max_rows
        ],
    }


def metric_matrix(con, dataset_id: str, suite_id: str | None = None) -> dict:
    ids = scoped_experiment_ids(con, dataset_id, suite_id)
    exp_filter, params = id_filter_sql(ids, "e")
    rows = con.execute(
        f"""
        SELECT e.experiment_id, e.retriever_name, m.metric_name, m.value
        FROM experiments e
        JOIN metrics m ON e.experiment_id = m.experiment_id
        WHERE e.dataset_id = ? AND {exp_filter}
          AND m.metric_name IN ('precision@10','recall@10','ndcg@10','mrr','map','latency_ms','zero_result_rate')
        ORDER BY e.retriever_name, m.metric_name
        """,
        [dataset_id, *params],
    ).fetchall()
    return {
        "dataset_id": dataset_id,
        "suite_id": suite_id,
        "experiment_ids": ids,
        "rows": [{"experiment_id": row[0], "retriever_name": row[1], "metric": row[2], "value": row[3] or 0} for row in rows],
    }


def failure_heatmap(con, dataset_id: str, suite_id: str | None = None, k: int = 10) -> dict:
    ids = scoped_experiment_ids(con, dataset_id, suite_id)
    exp_filter, params = id_filter_sql(ids)
    rows = con.execute(
        f"""
        SELECT qm.query_id, q.query, qm.retriever_name, qm.experiment_id, qm.recall, qm.ndcg,
               qm.first_relevant_rank, qm.bad_case_type, qm.difficulty_label, qm.latency_ms
        FROM query_metrics qm
        LEFT JOIN queries q ON q.dataset_id = qm.dataset_id AND q.query_id = qm.query_id
        WHERE qm.dataset_id = ? AND {exp_filter}
          AND qm.k = COALESCE((SELECT max(k) FROM query_metrics q2 WHERE q2.experiment_id = qm.experiment_id AND q2.k <= ?), qm.k)
        ORDER BY qm.query_id, qm.retriever_name
        """,
        [dataset_id, *params, k],
    ).fetchall()
    return {
        "dataset_id": dataset_id,
        "suite_id": suite_id,
        "rows": [
            {
                "query_id": row[0],
                "query": row[1] or "",
                "retriever_name": row[2],
                "experiment_id": row[3],
                "recall": row[4] or 0,
                "ndcg": row[5] or 0,
                "first_relevant_rank": row[6],
                "bad_case_type": row[7] or "",
                "difficulty_label": row[8] or "unknown",
                "latency_ms": row[9] or 0,
            }
            for row in rows
        ],
    }


def rank_movement(con, dataset_id: str, suite_id: str | None = None, query_id: str | None = None, k: int = 10) -> dict:
    ids = scoped_experiment_ids(con, dataset_id, suite_id)
    exp_filter, params = id_filter_sql(ids)
    where_query = "AND qm.query_id = ?" if query_id else ""
    query_params = [query_id] if query_id else []
    rows = con.execute(
        f"""
        SELECT qm.query_id, q.query, qm.retriever_name, qm.experiment_id, qm.first_relevant_rank,
               qm.recall, qm.ndcg, qm.latency_ms
        FROM query_metrics qm
        LEFT JOIN queries q ON q.dataset_id = qm.dataset_id AND q.query_id = qm.query_id
        WHERE qm.dataset_id = ? AND {exp_filter} {where_query}
          AND qm.k = COALESCE((SELECT max(k) FROM query_metrics q2 WHERE q2.experiment_id = qm.experiment_id AND q2.k <= ?), qm.k)
        ORDER BY qm.query_id, qm.retriever_name
        """,
        [dataset_id, *params, *query_params, k],
    ).fetchall()
    return {
        "dataset_id": dataset_id,
        "suite_id": suite_id,
        "rows": [
            {
                "query_id": row[0],
                "query": row[1] or "",
                "retriever_name": row[2],
                "experiment_id": row[3],
                "first_relevant_rank": row[4] if row[4] is not None else 999,
                "recall": row[5] or 0,
                "ndcg": row[6] or 0,
                "latency_ms": row[7] or 0,
            }
            for row in rows
        ],
    }


def retriever_battle(con, dataset_id: str, suite_id: str | None = None, k: int = 10) -> dict:
    ids = scoped_experiment_ids(con, dataset_id, suite_id)
    exp_rows = con.execute(
        f"""
        SELECT experiment_id, retriever_name FROM experiments
        WHERE experiment_id IN ({','.join(['?'] * len(ids)) if ids else 'NULL'})
        ORDER BY retriever_name
        """,
        ids,
    ).fetchall()
    pairs = []
    for idx, left in enumerate(exp_rows):
        for right in exp_rows[idx + 1 :]:
            comparison = pairwise_comparison(con, dataset_id, left[0], right[0], k)
            pairs.append(
                {
                    "left_experiment_id": left[0],
                    "left_retriever": left[1],
                    "right_experiment_id": right[0],
                    "right_retriever": right[1],
                    **comparison["summary"],
                    "hybrid_uplift_queries": comparison["hybrid_summary"]["hybrid_uplift_queries"],
                }
            )
    return {"dataset_id": dataset_id, "suite_id": suite_id, "pairs": pairs}


def insight_summary(con, dataset_id: str, suite_id: str | None = None) -> dict:
    overview = analytics_overview(con, dataset_id, suite_id)
    leaderboard = overview["leaderboard"]
    best = leaderboard[0] if leaderboard else None
    fastest = min(leaderboard, key=lambda row: row["latency_ms"]) if leaderboard else None
    metrics = query_metrics(con, dataset_id, suite_id=suite_id)
    by_retriever = defaultdict(list)
    for row in metrics:
        by_retriever[row["retriever_name"]].append(row["recall"])
    unstable = None
    variances = [(retriever, pvariance(vals) if len(vals) > 1 else 0) for retriever, vals in by_retriever.items()]
    if variances:
        retriever, variance = max(variances, key=lambda item: item[1])
        unstable = {"retriever_name": retriever, "recall_variance": variance}
    latest_ids = scoped_experiment_ids(con, dataset_id, suite_id)
    exp_by_retriever = {
        row[1]: row[0]
        for row in con.execute(
            f"SELECT experiment_id, retriever_name FROM experiments WHERE experiment_id IN ({','.join(['?'] * len(latest_ids))})" if latest_ids else "SELECT experiment_id, retriever_name FROM experiments WHERE 1=0",
            latest_ids,
        ).fetchall()
    }
    dense_beats_bm25 = []
    if "dense" in exp_by_retriever and "bm25" in exp_by_retriever:
        comparison = pairwise_comparison(con, dataset_id, exp_by_retriever["dense"], exp_by_retriever["bm25"])
        dense_beats_bm25 = [row for row in comparison["queries"] if row["outcome"] == "win"][:20]
    failure_rows = con.execute(
        """
        SELECT COALESCE(NULLIF(bad_case_type,''),'none') AS case_type, count(*)
        FROM query_metrics
        WHERE dataset_id = ? AND bad_case_type IS NOT NULL AND bad_case_type != ''
          AND experiment_id IN ({})
        GROUP BY case_type ORDER BY count(*) DESC
        """.format(",".join(["?"] * len(latest_ids)) if latest_ids else "NULL"),
        [dataset_id, *latest_ids],
    ).fetchall()
    return {
        "dataset_id": dataset_id,
        "suite_id": suite_id,
        "cards": [
            {"kind": "best_retriever", "title": "Best retriever by Recall@10", "value": best["retriever_name"] if best else "-", "details": best or {}},
            {"kind": "fastest_retriever", "title": "Fastest retriever", "value": fastest["retriever_name"] if fastest else "-", "details": fastest or {}},
            {"kind": "most_unstable_retriever", "title": "Most unstable retriever", "value": unstable["retriever_name"] if unstable else "-", "details": unstable or {}},
            {"kind": "top_failure_type", "title": "Top recurring failure type", "value": failure_rows[0][0] if failure_rows else "none", "details": {"count": failure_rows[0][1]} if failure_rows else {}},
        ],
        "dense_beats_bm25_queries": dense_beats_bm25,
    }
