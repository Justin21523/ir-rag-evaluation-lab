import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

from ir_rag_eval.api.deps import get_documents, get_queries
from ir_rag_eval.api.schemas import DatasetIngestRequest
from ir_rag_eval.api.schemas import DatasetImportJobRequest
from ir_rag_eval.config import settings
from ir_rag_eval.corpus.dataset_registry import (
    DEFAULT_DATASET_ID,
    compute_quality_checks,
    get_dataset,
    import_jsonl_dataset,
    list_datasets,
    refresh_dataset_counts,
    register_default_dataset,
)
from ir_rag_eval.corpus.loader import load_documents, load_queries, persist_corpus
from ir_rag_eval.corpus.sample_generator import generate_sample
from ir_rag_eval.db.connection import connect
from ir_rag_eval.jobs.manager import create_job, get_job, run_background
from ir_rag_eval.jobs.tasks import BEIR_PRESETS, run_import_job

router = APIRouter(prefix="/corpus", tags=["corpus"])


@router.get("/overview")
def overview(dataset_id: str = DEFAULT_DATASET_ID):
    documents = get_documents(dataset_id)
    queries = get_queries(dataset_id)
    categories: dict[str, int] = {}
    for doc in documents:
        category = str(doc.metadata.get("category", "unknown"))
        categories[category] = categories.get(category, 0) + 1
    with connect() as con:
        dataset = get_dataset(con, dataset_id)
    return {
        "dataset_id": dataset_id,
        "dataset": dataset,
        "document_count": len(documents),
        "query_count": len(queries),
        "qrels_count": sum(len(query["relevant_doc_ids"]) for query in queries),
        "available_retrievers": ["bm25", "dense", "hybrid", "rerank"],
        "metadata_distribution": categories,
    }


@router.get("/documents")
def documents(dataset_id: str = DEFAULT_DATASET_ID, limit: int = 100):
    return [doc.model_dump() for doc in get_documents(dataset_id)[:limit]]


@router.get("/documents/{doc_id}")
def document(doc_id: str, dataset_id: str = DEFAULT_DATASET_ID):
    for doc in get_documents(dataset_id):
        if doc.doc_id == doc_id:
            return doc.model_dump()
    raise HTTPException(status_code=404, detail="Document not found")


@router.get("/queries")
def queries(dataset_id: str = DEFAULT_DATASET_ID, limit: int = 100):
    return get_queries(dataset_id)[:limit]


@router.get("/queries/{query_id}")
def query(query_id: str, dataset_id: str = DEFAULT_DATASET_ID):
    for row in get_queries(dataset_id):
        if row["query_id"] == query_id:
            return row
    raise HTTPException(status_code=404, detail="Query not found")


@router.post("/sample")
def create_sample():
    generate_sample(settings.sample_dir)
    docs = load_documents(settings.sample_dir / "documents.jsonl")
    queries_ = load_queries(settings.sample_dir / "queries.jsonl")
    with connect() as con:
        persist_corpus(con, docs, queries_, dataset_id=DEFAULT_DATASET_ID)
        register_default_dataset(con)
    return {"status": "created", "documents": len(docs), "queries": len(queries_)}


@router.get("/datasets")
def datasets():
    with connect() as con:
        return list_datasets(con)


@router.get("/datasets/{dataset_id}")
def dataset_detail(dataset_id: str):
    with connect() as con:
        dataset = get_dataset(con, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.get("/datasets/{dataset_id}/overview")
def dataset_overview(dataset_id: str):
    return overview(dataset_id=dataset_id)


@router.get("/datasets/{dataset_id}/quality")
def dataset_quality(dataset_id: str):
    with connect() as con:
        if not get_dataset(con, dataset_id):
            raise HTTPException(status_code=404, detail="Dataset not found")
        return compute_quality_checks(con, dataset_id)


@router.get("/datasets/{dataset_id}/imports")
def dataset_imports(dataset_id: str):
    with connect() as con:
        rows = con.execute(
            """
            SELECT import_id, dataset_id, status, input_path, started_at, finished_at,
                   seen_count, imported_count, skipped_count, duplicate_count, error_count, message
            FROM dataset_imports WHERE dataset_id = ? ORDER BY started_at DESC
            """,
            [dataset_id],
        ).fetchall()
    return [
        {
            "import_id": row[0],
            "dataset_id": row[1],
            "status": row[2],
            "input_path": row[3],
            "started_at": row[4],
            "finished_at": row[5],
            "seen_count": row[6],
            "imported_count": row[7],
            "skipped_count": row[8],
            "duplicate_count": row[9],
            "error_count": row[10],
            "message": row[11],
        }
        for row in rows
    ]


@router.post("/datasets/ingest-local")
def ingest_local(request: DatasetIngestRequest):
    input_path = Path(request.input_path)
    if not input_path.exists():
        raise HTTPException(status_code=400, detail="Input path does not exist")
    with connect() as con:
        result = import_jsonl_dataset(
            con,
            request.dataset_id,
            request.name,
            request.dataset_type,
            request.version,
            request.license,
            input_path,
            resume=request.resume,
        )
        refresh_dataset_counts(con, request.dataset_id)
    return result


@router.get("/datasets/presets/beir")
def beir_presets():
    return BEIR_PRESETS


@router.post("/datasets/import-job")
def import_job(request: DatasetImportJobRequest):
    job_id = create_job("dataset_import", request.model_dump())
    run_background(job_id, run_import_job, request)
    return get_job(job_id)
