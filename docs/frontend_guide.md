# Frontend Guide

## Route Map

- `/` Overview
- `/corpus` Corpus
- `/query-evaluator` Query Evaluator
- `/experiment-workflow` Experiment Workflow
- `/retrieval-comparison` Retrieval Comparison
- `/analytics` Evaluation Analytics
- `/rag-citation-checker` RAG Citation Checker
- `/bad-cases` Bad Cases
- `/experiment-runs` Experiment Runs
- `/metric-glossary` Metric Glossary

## Components

Layout components live under `components/layout`. Shared states and display primitives live under `components/common`. Domain widgets are grouped by corpus, search, charts, RAG, and bad cases.

Analytics charts live in `components/charts/AnalyticsCharts.tsx`. The chart library includes leaderboard bars, Recall@K and nDCG@K curves, latency/recall scatter plots, bad case distributions, query difficulty donuts, first relevant rank histograms, and dataset metadata treemaps.

## API Client

`src/api/client.ts` defines the Axios client. `src/api/irApi.ts` owns endpoint-specific functions and typed responses used by hooks.

Analytics endpoints are consumed through `useAnalyticsOverview`, `useAnalyticsQueryMetrics`, and `useDatasetProfile`. These hooks power the Evaluation Analytics page and the dataset profiling charts embedded in Corpus.

## i18n

`react-i18next` loads `zh-TW.json` and `en-US.json`. The default locale is `zh-TW`, and the language switcher persists the chosen locale in `localStorage`. Components should use `t(...)` instead of hardcoding UI labels.

## Dataset Selection

The top toolbar includes a dataset selector backed by `GET /api/v1/corpus/datasets`. The selected dataset id is stored in `localStorage` and included in corpus, search, RAG, and evaluation API calls.

## Jobs and Workflow

Dataset Management and Experiment Workflow use the jobs API for progress. Jobs display status, phase, progress bar, logs, cancel, and retry. Batch experiment workflow submits `POST /api/v1/experiments/run-batch` and then watches `/api/v1/jobs`.

## Testing Strategy

Vitest and React Testing Library cover locale loading, language switching, page rendering, error states, query evaluator controls, retrieval comparison, and RAG citation checker entry points. Tests should mock API behavior at the hook/API boundary when adding deeper workflows.
