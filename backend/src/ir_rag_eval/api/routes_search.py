import time
import hashlib
from fastapi import APIRouter

from ir_rag_eval.api.deps import get_documents, get_queries
from ir_rag_eval.api.schemas import SearchRequest
from ir_rag_eval.db.connection import connect
from ir_rag_eval.experiments.run_persistence import persist_search_run
from ir_rag_eval.experiments.registry import build_retriever

router = APIRouter(tags=["search"])


@router.post("/search")
def search(request: SearchRequest):
    documents = get_documents(request.dataset_id)
    retriever = build_retriever(request.mode, documents)
    started = time.perf_counter()
    results = retriever.search(request.query, k=request.k, alpha=request.alpha)
    latency = (time.perf_counter() - started) * 1000
    relevant_doc_ids: list[str] = []
    query_id = f"adhoc_{hashlib.sha1(request.query.encode('utf-8')).hexdigest()[:10]}"
    for query in get_queries(request.dataset_id):
        if query["query"].lower() == request.query.lower():
            query_id = query["query_id"]
            relevant_doc_ids = query["relevant_doc_ids"]
    with connect() as con:
        run_id = persist_search_run(
            con,
            request.mode,
            query_id,
            results,
            latency,
            request.model_dump(),
            dataset_id=request.dataset_id,
        )
    return {
        "run_id": run_id,
        "dataset_id": request.dataset_id,
        "query_id": query_id,
        "query": request.query,
        "mode": request.mode,
        "k": request.k,
        "alpha": request.alpha,
        "latency_ms": latency,
        "relevant_doc_ids": relevant_doc_ids,
        "results": [result.__dict__ for result in results],
    }
