# Model Card

BM25 is the required deterministic baseline. Dense retrieval uses `IR_RAG_DENSE_BACKEND=auto` by default: it tries a sentence-transformers model and falls back to deterministic mock embeddings when unavailable.

Modes:

- `IR_RAG_DENSE_BACKEND=auto`: try real model, fallback mock.
- `IR_RAG_DENSE_BACKEND=mock`: always use deterministic mock embeddings.
- `IR_RAG_DENSE_BACKEND=sentence-transformers`: request a real model but still fail gracefully into mock if runtime loading fails.

Install real model support with `pip install -e "backend[dense]"`.

The reranker is an interface-compatible placeholder and should be replaced with a cross-encoder adapter for production experiments.
