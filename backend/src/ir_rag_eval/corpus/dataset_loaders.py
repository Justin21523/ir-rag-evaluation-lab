import csv
import gzip
import json
from collections import defaultdict
from pathlib import Path
from typing import Iterable


def write_jsonl(path: Path, rows: Iterable[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def read_jsonl(path: Path) -> Iterable[dict]:
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                yield json.loads(line)


def load_qrels(path: Path) -> dict[str, list[str]]:
    relevant: dict[str, list[str]] = defaultdict(list)
    if path.is_dir():
        files = sorted(path.glob("*.tsv")) + sorted(path.glob("*.txt"))
    else:
        files = [path]
    for file_path in files:
        with file_path.open("r", encoding="utf-8") as handle:
            for row in csv.reader(handle, delimiter="\t"):
                if len(row) < 3 or row[0].lower() in {"query-id", "query_id", "qid"}:
                    continue
                query_id = row[0]
                doc_id = row[2] if len(row) >= 4 else row[1]
                score = row[3] if len(row) >= 4 else row[2]
                try:
                    if float(score) <= 0:
                        continue
                except ValueError:
                    pass
                relevant[query_id].append(doc_id)
    return dict(relevant)


def convert_beir(input_dir: Path, output_dir: Path, limit_docs: int | None = None, limit_queries: int | None = None) -> dict:
    corpus_path = input_dir / "corpus.jsonl"
    queries_path = input_dir / "queries.jsonl"
    qrels_path = input_dir / "qrels"
    docs = []
    for idx, row in enumerate(read_jsonl(corpus_path)):
        if limit_docs is not None and idx >= limit_docs:
            break
        docs.append(
            {
                "doc_id": str(row.get("_id") or row.get("doc_id")),
                "title": row.get("title") or "",
                "text": row.get("text") or "",
                "metadata": {"source": "beir", "dataset": input_dir.name},
            }
        )
    qrels = load_qrels(qrels_path)
    queries = []
    for idx, row in enumerate(read_jsonl(queries_path)):
        if limit_queries is not None and idx >= limit_queries:
            break
        query_id = str(row.get("_id") or row.get("query_id"))
        queries.append({"query_id": query_id, "query": row.get("text") or row.get("query") or "", "relevant_doc_ids": qrels.get(query_id, [])})
    write_jsonl(output_dir / "documents.jsonl", docs)
    write_jsonl(output_dir / "queries.jsonl", queries)
    return {"documents": len(docs), "queries": len(queries), "output": str(output_dir)}


def convert_msmarco(input_dir: Path, output_dir: Path, limit_docs: int | None = None, limit_queries: int | None = None) -> dict:
    docs = []
    with (input_dir / "collection.tsv").open("r", encoding="utf-8") as handle:
        for idx, row in enumerate(csv.reader(handle, delimiter="\t")):
            if limit_docs is not None and idx >= limit_docs:
                break
            if len(row) >= 2:
                docs.append({"doc_id": row[0], "title": f"MS MARCO passage {row[0]}", "text": row[1], "metadata": {"source": "msmarco"}})
    qrels_file = next((p for p in [input_dir / "qrels.tsv", input_dir / "qrels.train.tsv", input_dir / "qrels.dev.tsv"] if p.exists()), None)
    qrels = load_qrels(qrels_file) if qrels_file else {}
    queries = []
    with (input_dir / "queries.tsv").open("r", encoding="utf-8") as handle:
        for idx, row in enumerate(csv.reader(handle, delimiter="\t")):
            if limit_queries is not None and idx >= limit_queries:
                break
            if len(row) >= 2:
                queries.append({"query_id": row[0], "query": row[1], "relevant_doc_ids": qrels.get(row[0], [])})
    write_jsonl(output_dir / "documents.jsonl", docs)
    write_jsonl(output_dir / "queries.jsonl", queries)
    return {"documents": len(docs), "queries": len(queries), "output": str(output_dir)}


def openalex_abstract(inverted_index: dict | None) -> str:
    if not inverted_index:
        return ""
    positions: dict[int, str] = {}
    for token, indexes in inverted_index.items():
        for index in indexes:
            positions[int(index)] = token
    return " ".join(positions[i] for i in sorted(positions))


def convert_openalex(input_path: Path, output_dir: Path, query_path: Path | None = None, limit_docs: int | None = None) -> dict:
    docs = []
    for idx, row in enumerate(read_jsonl(input_path)):
        if limit_docs is not None and idx >= limit_docs:
            break
        doc_id = str(row.get("id") or row.get("doi") or f"openalex_{idx}")
        title = row.get("display_name") or row.get("title") or doc_id
        text = openalex_abstract(row.get("abstract_inverted_index")) or title
        docs.append(
            {
                "doc_id": doc_id,
                "title": title,
                "text": text,
                "metadata": {
                    "source": "openalex",
                    "publication_year": row.get("publication_year"),
                    "type": row.get("type"),
                    "cited_by_count": row.get("cited_by_count"),
                },
            }
        )
    if query_path and query_path.exists():
        queries = list(read_jsonl(query_path))
    else:
        queries = [
            {
                "query_id": "openalex_q_001",
                "query": "scholarly works concepts citations",
                "relevant_doc_ids": [docs[0]["doc_id"]] if docs else [],
            }
        ]
    write_jsonl(output_dir / "documents.jsonl", docs)
    write_jsonl(output_dir / "queries.jsonl", queries)
    return {"documents": len(docs), "queries": len(queries), "output": str(output_dir)}


def convert_dataset(dataset: str, input_path: Path, output_dir: Path, query_path: Path | None = None, limit_docs: int | None = None, limit_queries: int | None = None) -> dict:
    if dataset == "beir":
        return convert_beir(input_path, output_dir, limit_docs, limit_queries)
    if dataset == "msmarco":
        return convert_msmarco(input_path, output_dir, limit_docs, limit_queries)
    if dataset == "openalex":
        return convert_openalex(input_path, output_dir, query_path, limit_docs)
    raise ValueError(f"Unsupported dataset: {dataset}")
