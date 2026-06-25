# Data Card

The included data is a small synthetic sample corpus for demonstration. It is safe to redistribute and covers IR, RAG citation, OpenAlex-style metadata, and legal RAG examples.

External datasets such as BEIR, MS MARCO, and OpenAlex have their own licenses and download flows. Keep restricted raw data outside this public repository.

Local converters are available through Makefile:

```bash
make load-beir INPUT=data/raw/beir/scifact OUTPUT=data/processed/beir/scifact
make load-msmarco INPUT=data/raw/msmarco OUTPUT=data/processed/msmarco/sample
make load-openalex INPUT=data/raw/openalex/works.jsonl OUTPUT=data/processed/openalex/sample
```

The converters produce project-standard `documents.jsonl` and `queries.jsonl` files without committing the original dataset.

Expected raw layouts:

- BEIR presets `scifact`, `nfcorpus`, `fiqa`, `trec-covid`: `corpus.jsonl`, `queries.jsonl`, `qrels/*.tsv`.
- MS MARCO passage: `collection.tsv`, `queries.tsv`, and optional `qrels.tsv` / `qrels.train.tsv` / `qrels.dev.tsv`.
- OpenAlex Works: `works.jsonl` or `works.jsonl.gz`; abstracts are rebuilt from `abstract_inverted_index`.

Import jobs expose phase and progress through `/api/v1/jobs` so the frontend can show convert, validate, persist, quality check, and report states.

`make sample-data` also creates richer generated profiles:

- `sample_ir_demo_100`
- `sample_legal_rag_50`
- `sample_openalex_100`
- `sample_ecommerce_search_100`

These profiles are registered in DuckDB and are intended to make the first-run UI feel like an evaluation lab rather than an empty demo.
