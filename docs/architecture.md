# Architecture

The system is a frontend/backend monorepo. FastAPI exposes evaluation APIs, DuckDB stores corpus metadata and experiment outputs, retrievers implement BM25/dense/hybrid/rerank interfaces, and React renders a bilingual dashboard.

```mermaid
flowchart TD
  Corpus[JSONL corpus] --> Loader[Corpus loader]
  Loader --> DuckDB[(DuckDB)]
  Loader --> Retrievers[Retrievers]
  Retrievers --> Metrics[IR metrics]
  Retrievers --> RAG[RAG citation evaluation]
  Metrics --> API[FastAPI]
  RAG --> API
  API --> UI[React dashboard]
```
