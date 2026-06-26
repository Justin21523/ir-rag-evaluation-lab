import json
from pathlib import Path

from ir_rag_eval.analytics import analytics_overview, dataset_profile, insight_summary, metric_matrix, failure_heatmap, rank_movement, retriever_battle
from ir_rag_eval.config import settings
from ir_rag_eval.llm.service import experiment_narrative, llm_dashboard, llm_status
from ir_rag_eval.text_mining import association_rules, cooccurrence, network, sankey, text_mining_summary


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
        bad_cases = con.execute(
            f"""
            SELECT case_id, experiment_id, query_id, case_type, description, reviewer_label,
                   root_cause, severity, owner, review_status
            FROM bad_cases WHERE experiment_id IN ({placeholders}) ORDER BY experiment_id, query_id
            """,
            exp_ids,
        ).fetchall()
    if dataset_id:
        quality = con.execute("SELECT check_name, severity, value FROM dataset_quality_checks WHERE dataset_id = ? ORDER BY check_name", [dataset_id]).fetchall()
    analytics = analytics_overview(con, dataset_id) if dataset_id else None
    profile = dataset_profile(con, dataset_id) if dataset_id else None
    insights = insight_summary(con, dataset_id) if dataset_id else None
    chart_payload = {}
    if dataset_id:
        chart_payload = {
            "dataset_id": dataset_id,
            "metric_matrix": metric_matrix(con, dataset_id),
            "failure_heatmap": failure_heatmap(con, dataset_id),
            "rank_movement": rank_movement(con, dataset_id),
            "retriever_battle": retriever_battle(con, dataset_id),
            "llm_dashboard": llm_dashboard(con, dataset_id),
            "text_summary": text_mining_summary(con, dataset_id),
            "text_network": network(con, dataset_id),
            "text_cooccurrence": cooccurrence(con, dataset_id),
            "text_sankey": sankey(con, dataset_id),
            "text_rules": association_rules(con, dataset_id),
        }
    llm_report = None
    if dataset_id and settings.llm_report_enabled:
        status = llm_status()
        if status.get("connected"):
            llm_report = experiment_narrative(con, dataset_id)
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
    if insights:
        lines.extend(["", "## Deterministic Insight Summary", "", "| Insight | Value |", "|---|---|"])
        for card in insights["cards"]:
            lines.append(f"| {card['title']} | {card['value']} |")
        if insights["dense_beats_bm25_queries"]:
            lines.extend(["", "### Dense Beats BM25 Queries", "", "| Query | Recall Delta | nDCG Delta |", "|---|---:|---:|"])
            for row in insights["dense_beats_bm25_queries"][:20]:
                lines.append(f"| {row['query_id']} | {row['recall_delta']:.4f} | {row['ndcg_delta']:.4f} |")
    lines.extend(["", "## Local LLM Analyst Notes", ""])
    if llm_report:
        narrative = llm_report["narrative"]
        lines.append(narrative.get("analyst_notes", ""))
        lines.extend(["", "- Why BM25 beats Dense: " + narrative.get("why_bm25_beats_dense", "")])
        for item in narrative.get("what_to_tune_next", []):
            lines.append(f"- Tune next: {item}")
    else:
        lines.append("Local llama.cpp judge was unavailable when this report was generated. Deterministic analytics remain valid.")
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
    if bad_cases:
        root_counts = {}
        severity_counts = {}
        status_counts = {}
        for row in bad_cases:
            root_counts[row[6] or "unknown"] = root_counts.get(row[6] or "unknown", 0) + 1
            severity_counts[row[7] or "medium"] = severity_counts.get(row[7] or "medium", 0) + 1
            status_counts[row[9] or "open"] = status_counts.get(row[9] or "open", 0) + 1
        lines.extend(["", "## Bad Case Review Distribution", "", "| Field | Value | Count |", "|---|---|---:|"])
        for label, counts in [("root_cause", root_counts), ("severity", severity_counts), ("review_status", status_counts)]:
            for key, value in sorted(counts.items()):
                lines.append(f"| {label} | {key} | {value} |")
    lines.extend(["", "## Top Failed Queries / Bad Case Appendix", "", "| Case | Experiment | Query | Type | Label | Severity | Root Cause | Status | Description |", "|---|---|---|---|---|---|---|---|---|"])
    for row in bad_cases[:100]:
        lines.append(f"| {row[0]} | {row[1]} | {row[2]} | {row[3]} | {row[5] or ''} | {row[7] or ''} | {row[6] or ''} | {row[9] or ''} | {row[4]} |")
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
    html_path.write_text(build_dashboard_html(lines, bars, analytic_bars, chart_payload), encoding="utf-8")
    return {"markdown_path": str(md_path), "html_path": str(html_path), "experiment_ids": exp_ids}


def build_dashboard_html(lines: list[str], bars: list[str], analytic_bars: list[str], payload: dict) -> str:
    payload_json = json.dumps(payload, ensure_ascii=False)
    fallback = "\n".join(lines)
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>IR/RAG Evaluation Dashboard Report</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js"></script>
  <style>
    body{{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;background:#f8fafc;color:#0f172a}}
    header{{padding:28px 36px;background:#0f172a;color:white}}
    main{{padding:24px 36px;display:grid;gap:18px}}
    .grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}}
    .card{{background:white;border:1px solid #e2e8f0;border-radius:10px;padding:16px;box-shadow:0 1px 2px rgba(15,23,42,.05)}}
    .wide{{grid-column:1/-1}}
    .chart{{height:420px}}
    table{{border-collapse:collapse;width:100%;margin:1rem 0;background:white}}td,th{{border:1px solid #d8dee6;padding:.45rem;text-align:left}}
    .bar{{height:10px;background:#e5e7eb;border-radius:999px}}.bar span{{display:block;height:10px;background:#0f766e;border-radius:999px}}
    pre{{white-space:pre-wrap;overflow:auto;background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px}}
    @media(max-width:900px){{.grid{{grid-template-columns:1fr}}header,main{{padding:18px}}}}
  </style>
</head>
<body>
  <header><h1>IR/RAG Evaluation Dashboard Report</h1><p>{payload.get("dataset_id") or "all datasets"}</p></header>
  <main>
    <section class="grid">
      <div class="card"><h2>Metric Matrix</h2><div id="metricMatrix" class="chart"></div></div>
      <div class="card"><h2>Retriever Battle</h2><div id="retrieverBattle" class="chart"></div></div>
      <div class="card"><h2>Failure Heatmap</h2><div id="failureHeatmap" class="chart"></div></div>
      <div class="card"><h2>Rank Movement</h2><div id="rankMovement" class="chart"></div></div>
      <div class="card wide"><h2>Co-occurrence Network</h2><div id="textNetwork" class="chart" style="height:720px"></div></div>
      <div class="card"><h2>Text Mining Sankey</h2><div id="textSankey" class="chart"></div></div>
      <div class="card"><h2>LLM Judge Statistics</h2><div id="llmStats" class="chart"></div></div>
      <div class="card"><h2>Association Rules</h2><div id="rules"></div></div>
    </section>
    <section class="card"><h2>Fallback Metric Charts</h2>{''.join(bars)}{''.join(analytic_bars)}</section>
    <section class="card"><h2>Markdown Report</h2><pre>{fallback}</pre></section>
  </main>
  <script id="payload" type="application/json">{payload_json}</script>
  <script>
    const payload = JSON.parse(document.getElementById('payload').textContent || '{{}}');
    const chart = (id, option) => {{ const el = document.getElementById(id); if (el && window.echarts) echarts.init(el).setOption(option); }};
    const matrixRows = payload.metric_matrix?.rows || [];
    const retrievers = [...new Set(matrixRows.map(r => r.retriever_name))];
    const metrics = payload.metric_matrix?.metrics || ['recall@10','ndcg@10','mrr','latency_ms','zero_result_rate'];
    chart('metricMatrix', {{tooltip:{{}},grid:{{left:90,right:24,bottom:80}},xAxis:{{type:'category',data:metrics,axisLabel:{{rotate:35}}}},yAxis:{{type:'category',data:retrievers}},visualMap:{{min:0,max:1,bottom:0,left:'center',orient:'horizontal'}},series:[{{type:'heatmap',data:matrixRows.flatMap(r=>metrics.map(m=>[metrics.indexOf(m),retrievers.indexOf(r.retriever_name),Number(r[m]||0)]))}}]}});
    const battle = payload.retriever_battle?.pairs || [];
    chart('retrieverBattle', {{tooltip:{{trigger:'axis'}},legend:{{}},xAxis:{{type:'category',data:battle.map(r=>`${{r.left_retriever}} vs ${{r.right_retriever}}`),axisLabel:{{rotate:25}}}},yAxis:{{type:'value'}},series:[{{name:'wins',type:'bar',stack:'x',data:battle.map(r=>r.wins)}},{{name:'losses',type:'bar',stack:'x',data:battle.map(r=>r.losses)}},{{name:'ties',type:'bar',stack:'x',data:battle.map(r=>r.ties)}}]}});
    const fh = payload.failure_heatmap?.rows || []; const q = [...new Set(fh.map(r=>r.query_id))].slice(0,40); const fr = [...new Set(fh.map(r=>r.retriever_name))];
    chart('failureHeatmap', {{tooltip:{{}},grid:{{left:90,right:24,bottom:70}},xAxis:{{type:'category',data:fr}},yAxis:{{type:'category',data:q}},visualMap:{{min:0,max:1,bottom:0,left:'center',orient:'horizontal'}},series:[{{type:'heatmap',data:fh.filter(r=>q.includes(r.query_id)).map(r=>[fr.indexOf(r.retriever_name),q.indexOf(r.query_id),Number((1-r.recall).toFixed(3))])}}]}});
    const rm = payload.rank_movement?.rows || []; const rr = [...new Set(rm.map(r=>r.retriever_name))]; const rq = [...new Set(rm.map(r=>r.query_id))].slice(0,16);
    chart('rankMovement', {{tooltip:{{trigger:'axis'}},xAxis:{{type:'category',data:rr}},yAxis:{{type:'value',inverse:true}},series:rq.map(id=>({{name:id,type:'line',smooth:true,data:rr.map(name=>(rm.find(r=>r.query_id===id&&r.retriever_name===name)||{{}}).first_relevant_rank||999)}}))}});
    chart('textSankey', {{tooltip:{{trigger:'item'}},series:[{{type:'sankey',data:payload.text_sankey?.nodes||[],links:payload.text_sankey?.links||[],lineStyle:{{color:'gradient',curveness:.5}}}}]}});
    const networkNodes = payload.text_network?.nodes || [];
    const networkCommunities = [...new Set(networkNodes.map(n=>n.community_id))].sort((a,b)=>a-b);
    chart('textNetwork', {{tooltip:{{formatter:p=>p.dataType==='edge'?`weight ${{p.data?.value||0}}`: `${{p.data?.name||''}}<br>count ${{p.data?.value||0}}<br>degree ${{p.data?.degree||0}}<br>pagerank ${{Number(p.data?.pagerank||0).toFixed(3)}}<br>C${{p.data?.community_id ?? '-'}}`}},legend:{{top:0,type:'scroll'}},series:[{{type:'graph',layout:'force',roam:true,draggable:true,label:{{show:true,fontSize:11}},force:{{repulsion:300,edgeLength:[80,220],gravity:.08}},categories:networkCommunities.map(id=>({{name:`C${{id}}`}})),data:networkNodes.map(n=>({{id:n.id,name:n.name,value:n.value,degree:n.degree,pagerank:n.pagerank,community_id:n.community_id,symbolSize:Math.max(16,Math.min(64,Math.sqrt(n.value)*7)),category:networkCommunities.indexOf(n.community_id)}})),links:(payload.text_network?.edges||[]).map(e=>({{source:e.source,target:e.target,value:e.value,lineStyle:{{width:Math.max(1,Math.min(9,e.value/2)),opacity:.42,curveness:.08}}}})),emphasis:{{focus:'adjacency',label:{{show:true}}}}}}]}});
    const dist = payload.llm_dashboard?.claim_judgment_distribution || {{}};
    chart('llmStats', {{tooltip:{{trigger:'item'}},series:[{{type:'pie',radius:['35%','70%'],data:Object.entries(dist).map(([name,value])=>({{name,value}}))}}]}});
    document.getElementById('rules').innerHTML = '<table><tr><th>Antecedent</th><th>Consequent</th><th>Support</th><th>Confidence</th><th>Lift</th></tr>' + (payload.text_rules?.rules||[]).slice(0,30).map(r=>`<tr><td>${{r.antecedent.join(', ')}}</td><td>${{r.consequent.join(', ')}}</td><td>${{Number(r.support).toFixed(3)}}</td><td>${{Number(r.confidence).toFixed(3)}}</td><td>${{Number(r.lift).toFixed(2)}}</td></tr>`).join('') + '</table>';
  </script>
</body>
</html>"""
