import json
import math
import re
from collections import Counter, defaultdict
from itertools import combinations
from uuid import uuid4

TOKEN_RE = re.compile(r"[A-Za-z][A-Za-z0-9_+-]{2,}")
STOPWORDS = {
    "and", "are", "but", "can", "for", "from", "has", "have", "into", "not", "that", "the", "this", "with",
    "about", "after", "before", "between", "during", "under", "using", "within", "without", "which", "their",
    "these", "those", "what", "when", "where", "while", "will", "would", "could", "should", "does", "did",
    "was", "were", "been", "being", "than", "then", "them", "they", "your", "you", "our", "ours",
}


def tokenize(text: str) -> list[str]:
    return [token.lower() for token in TOKEN_RE.findall(text or "") if token.lower() not in STOPWORDS]


def _documents(con, dataset_id: str, limit: int | None = None) -> list[dict]:
    sql = "SELECT doc_id, title, text, metadata_json FROM documents WHERE dataset_id = ? ORDER BY doc_id"
    if limit:
        sql += f" LIMIT {int(limit)}"
    rows = con.execute(sql, [dataset_id]).fetchall()
    return [
        {"doc_id": row[0], "title": row[1] or "", "text": row[2] or "", "metadata": json.loads(row[3] or "{}")}
        for row in rows
    ]


def _queries(con, dataset_id: str) -> list[dict]:
    rows = con.execute("SELECT query_id, query FROM queries WHERE dataset_id = ? ORDER BY query_id", [dataset_id]).fetchall()
    return [{"query_id": row[0], "query": row[1] or ""} for row in rows]


def _communities(terms: list[str], edges: list[dict]) -> dict[str, int]:
    graph: dict[str, set[str]] = {term: set() for term in terms}
    for edge in edges:
        graph.setdefault(edge["source_term"], set()).add(edge["target_term"])
        graph.setdefault(edge["target_term"], set()).add(edge["source_term"])
    communities: dict[str, int] = {}
    community_id = 0
    for term in terms:
        if term in communities:
            continue
        stack = [term]
        while stack:
            current = stack.pop()
            if current in communities:
                continue
            communities[current] = community_id
            stack.extend(sorted(graph.get(current, set()) - communities.keys()))
        community_id += 1
    return communities


def _pagerank(terms: list[str], edges: list[dict], iterations: int = 20, damping: float = 0.85) -> dict[str, float]:
    if not terms:
        return {}
    neighbors: dict[str, dict[str, float]] = {term: {} for term in terms}
    for edge in edges:
        neighbors.setdefault(edge["source_term"], {})[edge["target_term"]] = edge["weight"]
        neighbors.setdefault(edge["target_term"], {})[edge["source_term"]] = edge["weight"]
    rank = {term: 1.0 / len(terms) for term in terms}
    for _ in range(iterations):
        next_rank = {term: (1 - damping) / len(terms) for term in terms}
        for term, linked in neighbors.items():
            total = sum(linked.values()) or 1.0
            for target, weight in linked.items():
                next_rank[target] += damping * rank.get(term, 0.0) * (weight / total)
        rank = next_rank
    return rank


def _conviction(confidence: float, consequent_support: float) -> float:
    if confidence >= 1:
        return 999.0
    return (1 - consequent_support) / max(1e-9, 1 - confidence)


def _clear_run(con, dataset_id: str, run_id: str) -> None:
    for table in [
        "text_terms",
        "text_cooccurrences",
        "text_collocations",
        "text_network_nodes",
        "text_network_edges",
        "text_association_rules",
        "text_mining_sankey_links",
    ]:
        con.execute(f"DELETE FROM {table} WHERE dataset_id = ? AND run_id = ?", [dataset_id, run_id])


def run_text_mining(
    con,
    dataset_id: str,
    *,
    max_terms: int = 80,
    max_edges: int = 240,
    min_term_count: int = 2,
    min_support: float = 0.02,
    limit_docs: int | None = None,
) -> dict:
    run_id = f"text_{uuid4().hex[:10]}"
    config = {
        "max_terms": max_terms,
        "max_edges": max_edges,
        "min_term_count": min_term_count,
        "min_support": min_support,
        "limit_docs": limit_docs,
        "engine": "deterministic_ngram_network_v1",
    }
    con.execute(
        "INSERT INTO text_mining_runs VALUES (?, ?, ?, 'running', 0, 0, 0, 0, CURRENT_TIMESTAMP, NULL, '{}')",
        [run_id, dataset_id, json.dumps(config)],
    )
    docs = _documents(con, dataset_id, limit_docs)
    queries = _queries(con, dataset_id)
    doc_tokens = {doc["doc_id"]: tokenize(f"{doc['title']} {doc['text']}") for doc in docs}
    doc_sets = {doc_id: set(tokens) for doc_id, tokens in doc_tokens.items()}
    term_counts = Counter(token for tokens in doc_tokens.values() for token in tokens)
    doc_counts = Counter(term for terms in doc_sets.values() for term in terms)
    selected_terms = [
        term for term, count in term_counts.most_common(max_terms)
        if count >= min_term_count and term in doc_counts
    ]
    selected_set = set(selected_terms)
    n_docs = max(1, len(docs))
    term_rows = []
    for term in selected_terms:
        tfidf = term_counts[term] * math.log((1 + n_docs) / (1 + doc_counts[term])) + 1
        term_rows.append({"term": term, "doc_count": doc_counts[term], "term_count": term_counts[term], "tfidf": tfidf})

    pair_counts: Counter[tuple[str, str]] = Counter()
    for terms in doc_sets.values():
        filtered = sorted(terms & selected_set)
        for source, target in combinations(filtered, 2):
            pair_counts[(source, target)] += 1
    edge_rows = []
    for (source, target), weight in pair_counts.most_common(max_edges):
        source_docs = doc_counts[source]
        target_docs = doc_counts[target]
        expected = (source_docs / n_docs) * (target_docs / n_docs)
        observed = weight / n_docs
        pmi = math.log2(max(observed, 1e-9) / max(expected, 1e-9))
        union = source_docs + target_docs - weight
        jaccard = weight / union if union else 0
        edge_rows.append({"source_term": source, "target_term": target, "weight": float(weight), "pmi": pmi, "jaccard": jaccard})

    communities = _communities(selected_terms, edge_rows)
    pagerank = _pagerank(selected_terms, edge_rows)
    weighted_degree = Counter()
    degree_neighbors: dict[str, set[str]] = defaultdict(set)
    for edge in edge_rows:
        weighted_degree[edge["source_term"]] += edge["weight"]
        weighted_degree[edge["target_term"]] += edge["weight"]
        degree_neighbors[edge["source_term"]].add(edge["target_term"])
        degree_neighbors[edge["target_term"]].add(edge["source_term"])

    phrase_counts: Counter[tuple[str, ...]] = Counter()
    unigram_total = sum(term_counts.values()) or 1
    for tokens in doc_tokens.values():
        filtered = [token for token in tokens if token in selected_set]
        for n in [2, 3]:
            for i in range(0, max(0, len(filtered) - n + 1)):
                phrase_counts[tuple(filtered[i : i + n])] += 1
    collocations = []
    for phrase, count in phrase_counts.items():
        if count < 2:
            continue
        probabilities = [term_counts[token] / unigram_total for token in phrase]
        expected = math.prod(probabilities)
        observed = count / unigram_total
        pmi = math.log2(max(observed, 1e-9) / max(expected, 1e-9))
        collocations.append({"phrase": " ".join(phrase), "n": len(phrase), "count": count, "pmi": pmi, "score": pmi * math.log1p(count)})
    collocations.sort(key=lambda item: (item["score"], item["count"]), reverse=True)
    collocations = collocations[:80]

    baskets = [terms & selected_set for terms in doc_sets.values() if terms & selected_set]
    support_counts = Counter(term for basket in baskets for term in basket)
    pair_support = Counter()
    for basket in baskets:
        for source, target in combinations(sorted(basket), 2):
            pair_support[(source, target)] += 1
    n_baskets = max(1, len(baskets))
    rules = []
    for (source, target), pair_count in pair_support.items():
        support = pair_count / n_baskets
        if support < min_support:
            continue
        for antecedent, consequent in [(source, target), (target, source)]:
            confidence = pair_count / max(1, support_counts[antecedent])
            consequent_support = support_counts[consequent] / n_baskets
            lift = confidence / max(1e-9, consequent_support)
            rules.append({
                "antecedent": [antecedent],
                "consequent": [consequent],
                "support": support,
                "confidence": confidence,
                "lift": lift,
                "conviction": _conviction(confidence, consequent_support),
            })
    rules.sort(key=lambda item: (item["lift"], item["confidence"], item["support"]), reverse=True)
    rules = rules[:100]

    category_community = Counter()
    for doc in docs:
        category = str(doc["metadata"].get("category") or doc["metadata"].get("source") or "unknown")
        for term in doc_sets[doc["doc_id"]] & selected_set:
            category_community[(f"category:{category}", f"community:{communities.get(term, 0)}")] += 1
    query_difficulty = con.execute(
        """
        SELECT q.query, qm.difficulty_label, count(*)
        FROM query_metrics qm
        JOIN queries q ON q.dataset_id = qm.dataset_id AND q.query_id = qm.query_id
        WHERE qm.dataset_id = ? AND qm.k = 10
        GROUP BY q.query, qm.difficulty_label
        """,
        [dataset_id],
    ).fetchall()
    community_difficulty = Counter()
    for query, difficulty, count in query_difficulty:
        for term in set(tokenize(query)) & selected_set:
            community_difficulty[(f"community:{communities.get(term, 0)}", f"difficulty:{difficulty or 'unknown'}")] += count
    bad_case_rows = con.execute("SELECT root_cause, count(*) FROM bad_cases WHERE experiment_id IN (SELECT experiment_id FROM experiments WHERE dataset_id = ?) GROUP BY root_cause", [dataset_id]).fetchall()
    difficulty_root = Counter()
    for root_cause, count in bad_case_rows:
        difficulty_root[(f"difficulty:failed", f"root:{root_cause or 'unknown'}")] += count

    _clear_run(con, dataset_id, run_id)
    for row in term_rows:
        con.execute(
            "INSERT INTO text_terms VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [run_id, dataset_id, row["term"], row["doc_count"], row["term_count"], row["tfidf"], communities.get(row["term"], 0), pagerank.get(row["term"], 0.0)],
        )
    for row in edge_rows:
        con.execute("INSERT INTO text_cooccurrences VALUES (?, ?, ?, ?, ?, ?, ?)", [run_id, dataset_id, row["source_term"], row["target_term"], row["weight"], row["pmi"], row["jaccard"]])
        con.execute("INSERT INTO text_network_edges VALUES (?, ?, ?, ?, ?, ?)", [run_id, dataset_id, row["source_term"], row["target_term"], row["weight"], row["pmi"]])
    for row in collocations:
        con.execute("INSERT INTO text_collocations VALUES (?, ?, ?, ?, ?, ?, ?)", [run_id, dataset_id, row["phrase"], row["n"], row["count"], row["pmi"], row["score"]])
    for row in rules:
        con.execute(
            "INSERT INTO text_association_rules VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [run_id, dataset_id, json.dumps(row["antecedent"]), json.dumps(row["consequent"]), row["support"], row["confidence"], row["lift"], row["conviction"]],
        )
    for row in term_rows:
        term = row["term"]
        con.execute(
            "INSERT INTO text_network_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [run_id, dataset_id, term, term, row["term_count"], len(degree_neighbors[term]), weighted_degree[term], pagerank.get(term, 0.0), communities.get(term, 0)],
        )
    for stage, counter in [("category_community", category_community), ("community_difficulty", community_difficulty), ("difficulty_root", difficulty_root)]:
        for (source, target), value in counter.items():
            con.execute("INSERT INTO text_mining_sankey_links VALUES (?, ?, ?, ?, ?, ?)", [run_id, dataset_id, source, target, float(value), stage])

    summary = {
        "top_terms": [row["term"] for row in term_rows[:12]],
        "communities": len(set(communities.values())),
        "collocations": len(collocations),
        "association_rules": len(rules),
        "sankey_links": len(category_community) + len(community_difficulty) + len(difficulty_root),
    }
    con.execute(
        """
        UPDATE text_mining_runs
        SET status = 'completed', document_count = ?, term_count = ?, edge_count = ?, rule_count = ?,
            finished_at = CURRENT_TIMESTAMP, summary_json = ?
        WHERE run_id = ?
        """,
        [len(docs), len(term_rows), len(edge_rows), len(rules), json.dumps(summary), run_id],
    )
    return {
        "run_id": run_id,
        "dataset_id": dataset_id,
        "document_count": len(docs),
        "term_count": len(term_rows),
        "edge_count": len(edge_rows),
        "rule_count": len(rules),
        **summary,
    }


def latest_text_mining_run_id(con, dataset_id: str) -> str | None:
    row = con.execute(
        "SELECT run_id FROM text_mining_runs WHERE dataset_id = ? AND status = 'completed' ORDER BY finished_at DESC LIMIT 1",
        [dataset_id],
    ).fetchone()
    return row[0] if row else None


def text_mining_summary(con, dataset_id: str, run_id: str | None = None) -> dict:
    run_id = run_id or latest_text_mining_run_id(con, dataset_id)
    if not run_id:
        return {"dataset_id": dataset_id, "run_id": None, "available": False}
    row = con.execute(
        "SELECT run_id, document_count, term_count, edge_count, rule_count, summary_json, finished_at FROM text_mining_runs WHERE run_id = ?",
        [run_id],
    ).fetchone()
    return {
        "dataset_id": dataset_id,
        "run_id": run_id,
        "available": True,
        "document_count": row[1] or 0,
        "term_count": row[2] or 0,
        "edge_count": row[3] or 0,
        "rule_count": row[4] or 0,
        "summary": json.loads(row[5] or "{}"),
        "finished_at": str(row[6]) if row[6] else None,
    }


def text_terms(con, dataset_id: str, run_id: str | None = None, limit: int = 80) -> dict:
    run_id = run_id or latest_text_mining_run_id(con, dataset_id)
    rows = con.execute(
        """
        SELECT term, doc_count, term_count, tfidf, community_id, centrality
        FROM text_terms WHERE dataset_id = ? AND run_id = ?
        ORDER BY term_count DESC, tfidf DESC LIMIT ?
        """,
        [dataset_id, run_id, limit],
    ).fetchall() if run_id else []
    return {"dataset_id": dataset_id, "run_id": run_id, "terms": [{"term": r[0], "doc_count": r[1], "term_count": r[2], "tfidf": r[3], "community_id": r[4], "centrality": r[5]} for r in rows]}


def cooccurrence(con, dataset_id: str, run_id: str | None = None, limit: int = 240) -> dict:
    run_id = run_id or latest_text_mining_run_id(con, dataset_id)
    rows = con.execute(
        """
        SELECT source_term, target_term, weight, pmi, jaccard
        FROM text_cooccurrences WHERE dataset_id = ? AND run_id = ?
        ORDER BY weight DESC, pmi DESC LIMIT ?
        """,
        [dataset_id, run_id, limit],
    ).fetchall() if run_id else []
    return {"dataset_id": dataset_id, "run_id": run_id, "edges": [{"source": r[0], "target": r[1], "weight": r[2], "pmi": r[3], "jaccard": r[4]} for r in rows]}


def collocations(con, dataset_id: str, run_id: str | None = None, limit: int = 80) -> dict:
    run_id = run_id or latest_text_mining_run_id(con, dataset_id)
    rows = con.execute(
        "SELECT phrase, n, count, pmi, score FROM text_collocations WHERE dataset_id = ? AND run_id = ? ORDER BY score DESC LIMIT ?",
        [dataset_id, run_id, limit],
    ).fetchall() if run_id else []
    return {"dataset_id": dataset_id, "run_id": run_id, "collocations": [{"phrase": r[0], "n": r[1], "count": r[2], "pmi": r[3], "score": r[4]} for r in rows]}


def network(con, dataset_id: str, run_id: str | None = None, limit_edges: int = 240) -> dict:
    run_id = run_id or latest_text_mining_run_id(con, dataset_id)
    nodes = con.execute(
        "SELECT node_id, label, value, degree, weighted_degree, pagerank, community_id FROM text_network_nodes WHERE dataset_id = ? AND run_id = ? ORDER BY value DESC",
        [dataset_id, run_id],
    ).fetchall() if run_id else []
    edges = con.execute(
        "SELECT source, target, weight, pmi FROM text_network_edges WHERE dataset_id = ? AND run_id = ? ORDER BY weight DESC LIMIT ?",
        [dataset_id, run_id, limit_edges],
    ).fetchall() if run_id else []
    return {
        "dataset_id": dataset_id,
        "run_id": run_id,
        "nodes": [{"id": r[0], "name": r[1], "value": r[2], "degree": r[3], "weighted_degree": r[4], "pagerank": r[5], "community_id": r[6]} for r in nodes],
        "edges": [{"source": r[0], "target": r[1], "value": r[2], "pmi": r[3]} for r in edges],
    }


def association_rules(con, dataset_id: str, run_id: str | None = None, limit: int = 100) -> dict:
    run_id = run_id or latest_text_mining_run_id(con, dataset_id)
    rows = con.execute(
        """
        SELECT antecedent_json, consequent_json, support, confidence, lift, conviction
        FROM text_association_rules WHERE dataset_id = ? AND run_id = ?
        ORDER BY lift DESC, confidence DESC LIMIT ?
        """,
        [dataset_id, run_id, limit],
    ).fetchall() if run_id else []
    return {"dataset_id": dataset_id, "run_id": run_id, "rules": [{"antecedent": json.loads(r[0] or "[]"), "consequent": json.loads(r[1] or "[]"), "support": r[2], "confidence": r[3], "lift": r[4], "conviction": r[5]} for r in rows]}


def sankey(con, dataset_id: str, run_id: str | None = None) -> dict:
    run_id = run_id or latest_text_mining_run_id(con, dataset_id)
    rows = con.execute(
        "SELECT source, target, value, stage FROM text_mining_sankey_links WHERE dataset_id = ? AND run_id = ? ORDER BY stage, value DESC",
        [dataset_id, run_id],
    ).fetchall() if run_id else []
    node_names = sorted({r[0] for r in rows} | {r[1] for r in rows})
    return {
        "dataset_id": dataset_id,
        "run_id": run_id,
        "nodes": [{"name": name} for name in node_names],
        "links": [{"source": r[0], "target": r[1], "value": r[2], "stage": r[3]} for r in rows],
    }
