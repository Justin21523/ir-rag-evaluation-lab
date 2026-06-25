import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from ir_rag_eval.corpus.loader import load_documents, load_queries, persist_corpus, scoped_id


DEFAULT_DATASET_ID = "sample_default"


def now():
    return datetime.now(UTC)


def ensure_dataset(
    con,
    dataset_id: str,
    name: str,
    dataset_type: str = "custom",
    version: str = "local",
    license_name: str = "sample",
    description: str = "",
    source_path: str = "",
    metadata: dict | None = None,
) -> None:
    con.execute(
        """
        INSERT OR REPLACE INTO datasets
        (dataset_id, name, dataset_type, version, license, description, source_path, document_count, query_count, qrels_count, metadata_json, created_at, updated_at)
        VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          COALESCE((SELECT count(*) FROM documents WHERE dataset_id = ?), 0),
          COALESCE((SELECT count(*) FROM queries WHERE dataset_id = ?), 0),
          COALESCE((SELECT sum(json_array_length(relevant_doc_ids_json)) FROM queries WHERE dataset_id = ?), 0),
          ?,
          COALESCE((SELECT created_at FROM datasets WHERE dataset_id = ?), ?),
          ?
        )
        """,
        [
            dataset_id,
            name,
            dataset_type,
            version,
            license_name,
            description,
            source_path,
            dataset_id,
            dataset_id,
            dataset_id,
            json.dumps(metadata or {}, ensure_ascii=False),
            dataset_id,
            now(),
            now(),
        ],
    )


def refresh_dataset_counts(con, dataset_id: str) -> None:
    con.execute(
        """
        UPDATE datasets
        SET document_count = (SELECT count(*) FROM documents WHERE dataset_id = ?),
            query_count = (SELECT count(*) FROM queries WHERE dataset_id = ?),
            qrels_count = COALESCE((SELECT sum(json_array_length(relevant_doc_ids_json)) FROM queries WHERE dataset_id = ?), 0),
            updated_at = ?
        WHERE dataset_id = ?
        """,
        [dataset_id, dataset_id, dataset_id, now(), dataset_id],
    )


def register_default_dataset(con) -> None:
    exists = con.execute("SELECT dataset_id FROM datasets WHERE dataset_id = ?", [DEFAULT_DATASET_ID]).fetchone()
    if exists:
        return
    ensure_dataset(
        con,
        DEFAULT_DATASET_ID,
        "Sample Default",
        "sample",
        "local",
        "redistributable sample",
        "Built-in sample dataset",
        "data/sample",
    )
    refresh_dataset_counts(con, DEFAULT_DATASET_ID)


def list_datasets(con) -> list[dict]:
    register_default_dataset(con)
    rows = con.execute(
        """
        SELECT dataset_id, name, dataset_type, version, license, description, source_path,
               document_count, query_count, qrels_count, metadata_json, created_at, updated_at
        FROM datasets ORDER BY updated_at DESC
        """
    ).fetchall()
    return [
        {
            "dataset_id": row[0],
            "name": row[1],
            "dataset_type": row[2],
            "version": row[3],
            "license": row[4],
            "description": row[5],
            "source_path": row[6],
            "document_count": row[7],
            "query_count": row[8],
            "qrels_count": row[9] or 0,
            "metadata": json.loads(row[10] or "{}"),
            "created_at": row[11],
            "updated_at": row[12],
        }
        for row in rows
    ]


def get_dataset(con, dataset_id: str) -> dict | None:
    matches = [row for row in list_datasets(con) if row["dataset_id"] == dataset_id]
    return matches[0] if matches else None


def compute_quality_checks(con, dataset_id: str) -> list[dict]:
    con.execute("DELETE FROM dataset_quality_checks WHERE dataset_id = ?", [dataset_id])
    duplicate_docs = con.execute(
        "SELECT count(*) FROM (SELECT doc_id FROM documents WHERE dataset_id = ? GROUP BY doc_id HAVING count(*) > 1)",
        [dataset_id],
    ).fetchone()[0]
    empty_text = con.execute(
        "SELECT count(*) FROM documents WHERE dataset_id = ? AND length(trim(text)) = 0",
        [dataset_id],
    ).fetchone()[0]
    missing_labels = con.execute(
        "SELECT count(*) FROM queries WHERE dataset_id = ? AND json_array_length(relevant_doc_ids_json) = 0",
        [dataset_id],
    ).fetchone()[0]
    checks = [
        ("duplicate_documents", "warning" if duplicate_docs else "ok", duplicate_docs),
        ("empty_text_documents", "warning" if empty_text else "ok", empty_text),
        ("queries_missing_labels", "warning" if missing_labels else "ok", missing_labels),
    ]
    for name, severity, value in checks:
        con.execute(
            "INSERT INTO dataset_quality_checks VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
            [f"check_{uuid4().hex[:10]}", dataset_id, name, severity, int(value), "{}"],
        )
    rows = con.execute(
        "SELECT check_name, severity, value, details_json, created_at FROM dataset_quality_checks WHERE dataset_id = ? ORDER BY check_name",
        [dataset_id],
    ).fetchall()
    return [
        {"check_name": row[0], "severity": row[1], "value": row[2], "details": json.loads(row[3] or "{}"), "created_at": row[4]}
        for row in rows
    ]


def import_jsonl_dataset(
    con,
    dataset_id: str,
    name: str,
    dataset_type: str,
    version: str,
    license_name: str,
    input_dir: Path,
    resume: bool = True,
) -> dict:
    import_id = f"import_{uuid4().hex[:10]}"
    started = now()
    con.execute(
        "INSERT INTO dataset_imports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [import_id, dataset_id, "running", str(input_dir), started, None, 0, 0, 0, 0, 0, ""],
    )
    ensure_dataset(con, dataset_id, name, dataset_type, version, license_name, source_path=str(input_dir))
    documents = load_documents(input_dir / "documents.jsonl")
    queries = load_queries(input_dir / "queries.jsonl")
    if not resume:
        con.execute("DELETE FROM documents WHERE dataset_id = ?", [dataset_id])
        con.execute("DELETE FROM queries WHERE dataset_id = ?", [dataset_id])
    existing_docs = {row[0] for row in con.execute("SELECT doc_id FROM documents WHERE dataset_id = ?", [dataset_id]).fetchall()}
    existing_queries = {row[0] for row in con.execute("SELECT query_id FROM queries WHERE dataset_id = ?", [dataset_id]).fetchall()}
    duplicate_count = sum(1 for doc in documents if scoped_id(dataset_id, doc.doc_id) in existing_docs) + sum(
        1 for query in queries if scoped_id(dataset_id, query.query_id) in existing_queries
    )
    persist_corpus(con, documents, queries, dataset_id=dataset_id)
    refresh_dataset_counts(con, dataset_id)
    checks = compute_quality_checks(con, dataset_id)
    imported_count = len(documents) + len(queries)
    con.execute(
        """
        UPDATE dataset_imports
        SET status = ?, finished_at = ?, seen_count = ?, imported_count = ?, skipped_count = ?, duplicate_count = ?, error_count = ?, message = ?
        WHERE import_id = ?
        """,
        ["completed", now(), imported_count, imported_count, 0, duplicate_count, 0, "import completed", import_id],
    )
    return {"import_id": import_id, "dataset_id": dataset_id, "documents": len(documents), "queries": len(queries), "quality_checks": checks}
