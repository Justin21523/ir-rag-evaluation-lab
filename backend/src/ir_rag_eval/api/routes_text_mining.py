from fastapi import APIRouter
from pydantic import BaseModel

from ir_rag_eval.db.connection import connect
from ir_rag_eval.text_mining import (
    association_rules,
    collocations,
    cooccurrence,
    network,
    run_text_mining,
    sankey,
    text_mining_summary,
    text_terms,
)

router = APIRouter(tags=["text-mining"])


class TextMiningRunRequest(BaseModel):
    dataset_id: str = "sample_default"
    max_terms: int = 80
    max_edges: int = 240
    min_term_count: int = 2
    min_support: float = 0.02
    limit_docs: int | None = None


@router.post("/text-mining/run")
def run_text_mining_endpoint(request: TextMiningRunRequest):
    with connect() as con:
        return run_text_mining(
            con,
            request.dataset_id,
            max_terms=request.max_terms,
            max_edges=request.max_edges,
            min_term_count=request.min_term_count,
            min_support=request.min_support,
            limit_docs=request.limit_docs,
        )


@router.get("/text-mining/summary")
def get_text_mining_summary(dataset_id: str = "sample_default", run_id: str | None = None):
    with connect() as con:
        return text_mining_summary(con, dataset_id, run_id)


@router.get("/text-mining/terms")
def get_text_terms(dataset_id: str = "sample_default", run_id: str | None = None, limit: int = 80):
    with connect() as con:
        return text_terms(con, dataset_id, run_id, limit)


@router.get("/text-mining/cooccurrence")
def get_cooccurrence(dataset_id: str = "sample_default", run_id: str | None = None, limit: int = 240):
    with connect() as con:
        return cooccurrence(con, dataset_id, run_id, limit)


@router.get("/text-mining/collocations")
def get_collocations(dataset_id: str = "sample_default", run_id: str | None = None, limit: int = 80):
    with connect() as con:
        return collocations(con, dataset_id, run_id, limit)


@router.get("/text-mining/network")
def get_network(dataset_id: str = "sample_default", run_id: str | None = None, limit_edges: int = 240):
    with connect() as con:
        return network(con, dataset_id, run_id, limit_edges)


@router.get("/text-mining/association-rules")
def get_association_rules(dataset_id: str = "sample_default", run_id: str | None = None, limit: int = 100):
    with connect() as con:
        return association_rules(con, dataset_id, run_id, limit)


@router.get("/text-mining/sankey")
def get_sankey(dataset_id: str = "sample_default", run_id: str | None = None):
    with connect() as con:
        return sankey(con, dataset_id, run_id)
