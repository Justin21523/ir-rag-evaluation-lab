import json
from pathlib import Path

from ir_rag_eval.corpus.validator import DocumentRecord, QueryRecord


def read_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    if not path.exists():
        return rows
    with path.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at {path}:{line_no}") from exc
    return rows


def load_documents(path: Path) -> list[DocumentRecord]:
    return [DocumentRecord.model_validate(row) for row in read_jsonl(path)]


def load_queries(path: Path) -> list[QueryRecord]:
    return [QueryRecord.model_validate(row) for row in read_jsonl(path)]


def scoped_id(dataset_id: str, value: str) -> str:
    if dataset_id == "sample_default" or value.startswith(f"{dataset_id}::"):
        return value
    return f"{dataset_id}::{value}"


def persist_corpus(con, documents: list[DocumentRecord], queries: list[QueryRecord], dataset_id: str = "sample_default") -> None:
    for doc in documents:
        metadata = {**doc.metadata}
        if dataset_id != "sample_default":
            metadata.setdefault("original_doc_id", doc.doc_id)
        con.execute(
            """
            INSERT OR REPLACE INTO documents
            (dataset_id, doc_id, title, text, metadata_json, source)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                dataset_id,
                scoped_id(dataset_id, doc.doc_id),
                doc.title,
                doc.text,
                json.dumps(metadata, ensure_ascii=False),
                str(doc.metadata.get("source", "sample")),
            ],
        )
    for query in queries:
        metadata = {**query.metadata}
        relevant_ids = [scoped_id(dataset_id, doc_id) for doc_id in query.relevant_doc_ids]
        if dataset_id != "sample_default":
            metadata.setdefault("original_query_id", query.query_id)
        con.execute(
            """
            INSERT OR REPLACE INTO queries
            (dataset_id, query_id, query, relevant_doc_ids_json, metadata_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                dataset_id,
                scoped_id(dataset_id, query.query_id),
                query.query,
                json.dumps(relevant_ids, ensure_ascii=False),
                json.dumps(metadata, ensure_ascii=False),
            ],
        )
