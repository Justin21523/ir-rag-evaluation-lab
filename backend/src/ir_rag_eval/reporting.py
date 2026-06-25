import json
from pathlib import Path

from ir_rag_eval.analytics import analytics_overview, dataset_profile
from ir_rag_eval.config import settings


def build_report(con, dataset_id: str | None = None) -> dict:
    report_dir = settings.data_dir / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    dataset_filter = "WHERE dataset_id = ?" if dataset_id else ""
    params = [dataset_id] if dataset_id else []
    datasets = con.execute(
        f"SELECT dataset_id, name, dataset_type, version, license, document_count, query_count, qrels_count FROM datasets {dataset_filter} ORDER BY updated_at DESC",
        params,
    ).fetchall()
    experiments = con.execute(
        f"SELECT experiment_id, dataset_id, name, retriever_name, config_json, status FROM experiments {dataset_filter} ORDER BY started_at DESC",
        params,
    ).fetchall()
    exp_ids = [row[0] for row in experiments]
    metrics = []
    bad_cases = []
    quality = []
    if exp_ids:
        placeholders = ",".join(["?"] * len(exp_ids))
        metrics = con.execute(f"SELECT experiment_id, metric_name, k, value FROM metrics WHERE experiment_id IN ({placeholders}) ORDER BY experiment_id, metric_name", exp_ids).fetchall()
        bad_cases = con.execute(f"SELECT case_id, experiment_id, query_id, case_type, description, reviewer_label FROM bad_cases WHERE experiment_id IN ({placeholders}) ORDER BY experiment_id, query_id", exp_ids).fetchall()
    if dataset_id:
        quality = con.execute("SELECT check_name, severity, value FROM dataset_quality_checks WHERE dataset_id = ? ORDER BY check_name", [dataset_id]).fetchall()
    analytics = analytics_overview(con, dataset_id) if dataset_id else None
    profile = dataset_profile(con, dataset_id) if dataset_id else None
    metric_map: dict[str, dict[str, float]] = {}
    for exp_id, metric, _k, value in metrics:
        metric_map.setdefault(exp_id, {})[metric] = float(value)
    best = sorted(
        ((exp_id, vals.get("recall@10", 0.0), vals.get("ndcg@10", 0.0)) for exp_id, vals in metric_map.items()),
        key=lambda item: (item[1], item[2]),
        reverse=True,
    )
    lines = ["# Evaluation Report", "", "## Dataset Card", "", "| Dataset | Type | Version | License | Docs | Queries | Labels |", "|---|---|---|---|---:|---:|---:|"]
    for row in datasets:
        lines.append(f"| {row[1]} (`{row[0]}`) | {row[2]} | {row[3]} | {row[4]} | {row[5]} | {row[6]} | {row[7]} |")
    lines.extend(["", "## Quality Checks", "", "| Check | Severity | Value |", "|---|---|---:|"])
    for row in quality:
        lines.append(f"| {row[0]} | {row[1]} | {row[2]} |")
    lines.extend(["", "## Best / Worst Retriever Summary", ""])
    if best:
        lines.append(f"- Best Recall@10: `{best[0][0]}` ({best[0][1]:.4f})")
        lines.append(f"- Lowest Recall@10: `{best[-1][0]}` ({best[-1][1]:.4f})")
    lines.extend(["", "## Metrics", "", "| Experiment | Metric | K | Value |", "|---|---|---:|---:|"])
    for row in metrics:
        lines.append(f"| {row[0]} | {row[1]} | {row[2] or ''} | {row[3]:.4f} |")
    if analytics:
        lines.extend(["", "## Per-query Analytics", "", "### Query Difficulty", "", "| Difficulty | Query Count |", "|---|---:|"])
        for row in analytics["difficulty"]:
            lines.append(f"| {row['difficulty_label']} | {row['query_count']} |")
        lines.extend(["", "### Bad Case Distribution", "", "| Case Type | Count |", "|---|---:|"])
        for row in analytics["bad_cases"]:
            lines.append(f"| {row['case_type']} | {row['count']} |")
    if profile:
        lines.extend(["", "## Dataset Profiling", "", "### Document Length Buckets", "", "| Token Bucket | Documents |", "|---:|---:|"])
        for row in profile["document_lengths"][:25]:
            lines.append(f"| {row['bucket']} | {row['count']} |")
        lines.extend(["", "### Label Density", "", "| Label Bucket | Queries |", "|---:|---:|"])
        for row in profile["label_density"][:25]:
            lines.append(f"| {row['bucket']} | {row['count']} |")
    lines.extend(["", "## Top Failed Queries / Bad Case Appendix", "", "| Case | Experiment | Query | Type | Label | Description |", "|---|---|---|---|---|---|"])
    for row in bad_cases[:100]:
        lines.append(f"| {row[0]} | {row[1]} | {row[2]} | {row[3]} | {row[5] or ''} | {row[4]} |")
    lines.extend(["", "## Citation Support", "", "RAG citation support is available from RAG answer evaluations and claim-level citation checks."])
    lines.extend(["", "## Reproducibility", "", "```json", json.dumps({"dataset_id": dataset_id, "experiment_ids": exp_ids}, indent=2), "```"])
    suffix = dataset_id or "all"
    md_path = report_dir / f"evaluation_report_{suffix}.md"
    html_path = report_dir / f"evaluation_report_{suffix}.html"
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    bars = []
    for exp_id, vals in metric_map.items():
        for metric in ["recall@10", "ndcg@10", "mrr", "zero_result_rate"]:
            if metric in vals:
                width = max(2, min(100, vals[metric] * 100))
                bars.append(f"<div><b>{exp_id} {metric}</b><div class='bar'><span style='width:{width}%'></span></div><small>{vals[metric]:.4f}</small></div>")
    analytic_bars = []
    if analytics:
        for row in analytics["difficulty"] + analytics["bad_cases"]:
            label = row.get("difficulty_label") or row.get("case_type")
            count = row.get("query_count") or row.get("count") or 0
            analytic_bars.append(f"<div><b>{label}</b><div class='bar'><span style='width:{min(100, max(2, count * 8))}%'></span></div><small>{count}</small></div>")
    html_path.write_text(
        "<!doctype html><html><head><meta charset='utf-8'><title>Evaluation Report</title>"
        "<style>body{font-family:Inter,system-ui;margin:2rem;max-width:1160px;color:#1f2933}table{border-collapse:collapse;width:100%;margin:1rem 0}td,th{border:1px solid #d8dee6;padding:.45rem;text-align:left}.bar{height:10px;background:#e5e7eb;border-radius:999px}.bar span{display:block;height:10px;background:#0f766e;border-radius:999px}</style>"
        "</head><body><h1>Evaluation Report</h1><h2>Metric Charts</h2>"
        + "".join(bars)
        + "<h2>Analytics Charts</h2>"
        + "".join(analytic_bars)
        + "<hr><pre>"
        + "\n".join(lines)
        + "</pre></body></html>",
        encoding="utf-8",
    )
    return {"markdown_path": str(md_path), "html_path": str(html_path), "experiment_ids": exp_ids}
