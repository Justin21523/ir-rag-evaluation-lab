import json
from pathlib import Path

SAMPLE_DOCUMENTS = [
    {
        "doc_id": "doc_001",
        "title": "BM25 baseline for search evaluation",
        "text": "BM25 is a lexical retrieval baseline that scores documents by term frequency, inverse document frequency, and document length normalization.",
        "metadata": {"source": "sample", "year": 2025, "category": "ir"},
    },
    {
        "doc_id": "doc_002",
        "title": "Dense retrieval interface",
        "text": "Dense retrieval maps queries and documents into embedding vectors. This lab can use sentence-transformers or deterministic mock embeddings for offline demos.",
        "metadata": {"source": "sample", "year": 2025, "category": "ir"},
    },
    {
        "doc_id": "doc_003",
        "title": "Hybrid search scoring",
        "text": "Hybrid search combines normalized BM25 and dense scores. The alpha parameter controls how much weight dense retrieval receives.",
        "metadata": {"source": "sample", "year": 2025, "category": "ir"},
    },
    {
        "doc_id": "doc_004",
        "title": "RAG citation coverage",
        "text": "Citation coverage measures whether generated answers cite retrieved evidence documents. Unsupported claims should be flagged for manual review.",
        "metadata": {"source": "sample", "year": 2025, "category": "rag"},
    },
    {
        "doc_id": "doc_005",
        "title": "OpenAlex style scholarly metadata",
        "text": "OpenAlex data includes works, authors, institutions, venues, concepts, and citation metadata for scholarly discovery experiments.",
        "metadata": {"source": "sample", "year": 2025, "category": "openalex"},
    },
    {
        "doc_id": "doc_006",
        "title": "Legal RAG evaluation",
        "text": "Legal RAG systems require faithful answers, exact citations, jurisdiction metadata, and careful bad case analysis for missing authority.",
        "metadata": {"source": "sample", "year": 2025, "category": "legal"},
    },
]

SAMPLE_QUERIES = [
    {"query_id": "q_001", "query": "why use BM25 baseline", "relevant_doc_ids": ["doc_001"]},
    {"query_id": "q_002", "query": "hybrid alpha dense bm25 score", "relevant_doc_ids": ["doc_003"]},
    {"query_id": "q_003", "query": "rag citation coverage unsupported claims", "relevant_doc_ids": ["doc_004"]},
    {"query_id": "q_004", "query": "OpenAlex scholarly metadata fields", "relevant_doc_ids": ["doc_005"]},
    {"query_id": "q_005", "query": "legal rag faithful citations", "relevant_doc_ids": ["doc_006", "doc_004"]},
]


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def generate_sample(sample_dir: Path) -> None:
    write_jsonl(sample_dir / "documents.jsonl", SAMPLE_DOCUMENTS)
    write_jsonl(sample_dir / "queries.jsonl", SAMPLE_QUERIES)


def profile_rows(prefix: str, count: int, domain: str) -> tuple[list[dict], list[dict]]:
    docs = []
    for idx in range(1, count + 1):
        doc_id = f"{prefix}_doc_{idx:03d}"
        topic = ["retrieval", "citation", "metadata", "ranking", "latency"][idx % 5]
        docs.append(
            {
                "doc_id": doc_id,
                "title": f"{domain} {topic} document {idx}",
                "text": (
                    f"This {domain} benchmark document discusses {topic}, evaluation labels, "
                    f"ranking evidence, and reproducible IR experiments. Document number {idx}."
                ),
                "metadata": {"source": "generated_sample", "category": domain, "topic": topic, "year": 2025 + (idx % 2)},
            }
        )
    query_count = max(10, min(30, count // 3))
    queries = []
    for idx in range(1, query_count + 1):
        target = ((idx - 1) * 3 % count) + 1
        topic = ["retrieval", "citation", "metadata", "ranking", "latency"][target % 5]
        queries.append(
            {
                "query_id": f"{prefix}_q_{idx:03d}",
                "query": f"{domain} {topic} evidence query {idx}",
                "relevant_doc_ids": [f"{prefix}_doc_{target:03d}", f"{prefix}_doc_{min(count, target + 1):03d}"],
                "metadata": {"source": "generated_sample", "category": domain},
            }
        )
    return docs, queries


def generate_sample_profiles(data_dir: Path) -> list[dict]:
    profiles = [
        ("sample_ir_demo_100", "ir_demo", 100, "ir"),
        ("sample_legal_rag_50", "legal_rag", 50, "legal"),
        ("sample_openalex_100", "openalex", 100, "openalex"),
        ("sample_ecommerce_search_100", "ecommerce_search", 100, "ecommerce"),
    ]
    generated = []
    for dataset_id, dirname, count, domain in profiles:
        docs, queries = profile_rows(dirname, count, domain)
        output_dir = data_dir / "sample" / dirname
        write_jsonl(output_dir / "documents.jsonl", docs)
        write_jsonl(output_dir / "queries.jsonl", queries)
        generated.append(
            {
                "dataset_id": dataset_id,
                "name": dirname.replace("_", " ").title(),
                "dataset_type": "sample",
                "version": "generated-v1",
                "license": "redistributable sample",
                "path": output_dir,
                "documents": len(docs),
                "queries": len(queries),
            }
        )
    return generated
