# Data

This repository includes only a small redistributable sample corpus under `data/sample`.

Larger BEIR, MS MARCO, and OpenAlex datasets should be reconstructed through their official loaders or download instructions. Do not commit restricted raw corpora, generated DuckDB files, private documents, or model artifacts.

Supported custom JSONL files:

```json
{"doc_id":"doc_001","title":"Document title","text":"Document body","metadata":{"source":"sample","year":2025,"category":"demo"}}
```

```json
{"query_id":"q_001","query":"sample query","relevant_doc_ids":["doc_001"]}
```
