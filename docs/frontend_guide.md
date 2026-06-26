# Frontend Guide

## Route Map

- `/` Overview
- `/corpus` Corpus
- `/query-evaluator` Query Evaluator
- `/experiment-workflow` Experiment Workflow
- `/retrieval-comparison` Retrieval Comparison
- `/analytics` Evaluation Analytics
- `/text-mining` Text Mining
- `/llm-evaluation` LLM Evaluation
- `/rag-citation-checker` RAG Citation Checker
- `/bad-cases` Bad Cases
- `/experiment-runs` Experiment Runs
- `/metric-glossary` Metric Glossary

## Components

Layout components live under `components/layout`. Shared states and display primitives live under `components/common`. Domain widgets are grouped by corpus, search, charts, RAG, and bad cases.

Analytics charts live in `components/charts/AnalyticsCharts.tsx`. The chart library includes leaderboard bars, Recall@K and nDCG@K curves, latency/recall scatter plots, bad case distributions, query difficulty donuts, first relevant rank histograms, and dataset metadata treemaps.
Evaluation Analytics also includes deterministic insight cards, pairwise experiment comparison, tradeoff scatter charts, and a query diagnostics drawer opened from failed-query rows or chart points.
`components/charts/InteractiveAnalyticsCharts.tsx` adds Apache ECharts views for metric matrix heatmaps, query failure heatmaps, first-relevant-rank movement across retrievers, and all-pairs retriever battle summaries. Failure heatmap and rank movement points should open query diagnostics rather than leaving users at aggregate charts.
`components/charts/TextMiningCharts.tsx` adds ECharts views for co-occurrence network graphs, term community treemaps, co-occurrence heatmaps, Sankey corpus-to-failure flows, collocation bars, and association rule tables.
The newer interactive metric explorer uses Apache ECharts for brush, zoom, metric toggles, and point-click diagnostics. The rest of the dashboard can keep Recharts where simpler static charts are sufficient.

Local LLM UI surfaces include the Command Center LLM status panel, Bad Case AI Suggestion controls, Query Rewrite Sandbox, Query Rewrite Experiment, RAG Faithfulness Workbench, LLM Evaluation Dashboard, and the interactive diagnostics canvas. All LLM surfaces must display that model output is assistive, not ground truth.

The LLM Evaluation Dashboard uses Apache ECharts for claim judgment donuts, root cause bars, confidence histograms, latency trend lines, and rewrite improvement bars. Prompt request/response JSON belongs in collapsible debug panels only; the primary UI should use structured cards, badges, confidence bars, rationale panels, and review actions.

## API Client

`src/api/client.ts` defines the Axios client. `src/api/irApi.ts` owns endpoint-specific functions and typed responses used by hooks.

Analytics endpoints are consumed through `useAnalyticsOverview`, `useAnalyticsQueryMetrics`, and `useDatasetProfile`. These hooks power the Evaluation Analytics page and the dataset profiling charts embedded in Corpus. Analytics defaults to latest-per-retriever for the selected dataset, and the suite selector passes `suite_id` when the user wants one reproducible batch.
Decision-tool endpoints are consumed through `useQueryDiagnostics`, `usePairwiseComparison`, `useCorrelations`, `useInsights`, `useMetricMatrix`, `useFailureHeatmap`, `useRankMovement`, and `useRetrieverBattle`.
Local LLM endpoints are consumed through `useLlmStatus`, `useLlmDashboard`, `useLlmRuns`, `useQueryRewrite`, `useQueryRewriteExperiment`, and bad case suggestion mutations.
Text Mining endpoints are consumed through `useTextMiningSummary`, `useTextTerms`, `useTextNetwork`, `useTextCooccurrence`, `useTextCollocations`, `useTextAssociationRules`, `useTextSankey`, and `useRunTextMining`.

## i18n

`react-i18next` loads `zh-TW.json` and `en-US.json`. The default locale is `zh-TW`, and the language switcher persists the chosen locale in `localStorage`. Components should use `t(...)` instead of hardcoding UI labels.

## Dataset Selection

The top toolbar includes a dataset selector backed by `GET /api/v1/corpus/datasets`. The selected dataset id is stored in `localStorage` and included in corpus, search, RAG, LLM, and evaluation API calls. The default dataset is `sample_ir_demo_100` after `make refresh-lab`.

## Jobs and Workflow

Dataset Management and Experiment Workflow use the jobs API for progress. Jobs display status, phase, progress bar, logs, cancel, and retry. Batch experiment workflow submits `POST /api/v1/experiments/run-batch` and then watches `/api/v1/jobs`.

## Report Dashboard

`make report` writes a Markdown report and a dashboard-style HTML artifact. The HTML report embeds JSON payloads and ECharts charts for retrieval metrics, failure heatmaps, retriever battle, rank movement, LLM judge statistics, text-mining Sankey, co-occurrence network, and association rules. It keeps fallback tables for offline readability.

## Testing Strategy

Vitest and React Testing Library cover locale loading, language switching, page rendering, error states, query evaluator controls, retrieval comparison, and RAG citation checker entry points. Tests should mock API behavior at the hook/API boundary when adding deeper workflows.
