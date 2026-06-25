import json
from pathlib import Path

from ir_rag_eval.config import settings
from ir_rag_eval.corpus.dataset_registry import DEFAULT_DATASET_ID, register_default_dataset
from ir_rag_eval.corpus.loader import load_documents, load_queries
from ir_rag_eval.corpus.sample_generator import generate_sample
from ir_rag_eval.db.connection import connect
from ir_rag_eval.retrievers.base import rows_to_documents


def ensure_sample_exists() -> None:
    if not (settings.sample_dir / "documents.jsonl").exists():
        generate_sample(settings.sample_dir)


def get_documents(dataset_id: str = DEFAULT_DATASET_ID):
    ensure_sample_exists()
    with connect() as con:
        if dataset_id == DEFAULT_DATASET_ID:
            register_default_dataset(con)
        rows = con.execute(
            "SELECT doc_id, title, text, metadata_json FROM documents WHERE dataset_id = ? ORDER BY doc_id",
            [dataset_id],
        ).fetchall()
    if rows:
        return rows_to_documents(rows)
    if dataset_id == DEFAULT_DATASET_ID:
        return load_documents(settings.sample_dir / "documents.jsonl")
    return []


def get_queries(dataset_id: str = DEFAULT_DATASET_ID):
    ensure_sample_exists()
    with connect() as con:
        if dataset_id == DEFAULT_DATASET_ID:
            register_default_dataset(con)
        rows = con.execute(
            "SELECT query_id, query, relevant_doc_ids_json, metadata_json FROM queries WHERE dataset_id = ? ORDER BY query_id",
            [dataset_id],
        ).fetchall()
    if rows:
        return [
            {
                "query_id": row[0],
                "query": row[1],
                "relevant_doc_ids": json.loads(row[2] or "[]"),
                "metadata": json.loads(row[3] or "{}"),
            }
            for row in rows
        ]
    if dataset_id == DEFAULT_DATASET_ID:
        return [query.model_dump() for query in load_queries(settings.sample_dir / "queries.jsonl")]
    return []


def sample_paths() -> tuple[Path, Path]:
    return settings.sample_dir / "documents.jsonl", settings.sample_dir / "queries.jsonl"
