from fastapi import APIRouter

from ir_rag_eval.analytics import (
    analytics_overview,
    correlation_data,
    dataset_profile,
    failure_heatmap,
    insight_summary,
    metric_matrix,
    pairwise_comparison,
    query_diagnostics,
    query_metrics,
    rank_movement,
    retriever_battle,
)
from ir_rag_eval.db.connection import connect

router = APIRouter(tags=["analytics"])


@router.get("/analytics/overview")
def get_analytics_overview(dataset_id: str = "sample_default", suite_id: str | None = None):
    with connect() as con:
        return analytics_overview(con, dataset_id, suite_id)


@router.get("/analytics/query-metrics")
def get_query_metrics(dataset_id: str = "sample_default", experiment_id: str | None = None, suite_id: str | None = None):
    with connect() as con:
        return query_metrics(con, dataset_id, experiment_id, suite_id)


@router.get("/analytics/dataset-profile")
def get_dataset_profile(dataset_id: str = "sample_default"):
    with connect() as con:
        return dataset_profile(con, dataset_id)


@router.get("/analytics/report-data")
def get_report_data(dataset_id: str = "sample_default"):
    with connect() as con:
        return {"overview": analytics_overview(con, dataset_id), "dataset_profile": dataset_profile(con, dataset_id)}


@router.get("/analytics/query-diagnostics")
def get_query_diagnostics(dataset_id: str = "sample_default", query_id: str = "", experiment_ids: str = "", k: int = 10):
    ids = [item for item in experiment_ids.split(",") if item]
    with connect() as con:
        return query_diagnostics(con, dataset_id, query_id, ids or None, k)


@router.get("/analytics/pairwise")
def get_pairwise_comparison(dataset_id: str, left_experiment_id: str, right_experiment_id: str, k: int = 10):
    with connect() as con:
        return pairwise_comparison(con, dataset_id, left_experiment_id, right_experiment_id, k)


@router.get("/analytics/correlations")
def get_correlations(dataset_id: str = "sample_default", k: int = 10, suite_id: str | None = None):
    with connect() as con:
        return correlation_data(con, dataset_id, k, suite_id)


@router.get("/analytics/insights")
def get_insights(dataset_id: str = "sample_default", suite_id: str | None = None):
    with connect() as con:
        return insight_summary(con, dataset_id, suite_id)


@router.get("/analytics/metric-matrix")
def get_metric_matrix(dataset_id: str = "sample_default", suite_id: str | None = None):
    with connect() as con:
        return metric_matrix(con, dataset_id, suite_id)


@router.get("/analytics/failure-heatmap")
def get_failure_heatmap(dataset_id: str = "sample_default", suite_id: str | None = None, k: int = 10):
    with connect() as con:
        return failure_heatmap(con, dataset_id, suite_id, k)


@router.get("/analytics/rank-movement")
def get_rank_movement(dataset_id: str = "sample_default", suite_id: str | None = None, query_id: str | None = None, k: int = 10):
    with connect() as con:
        return rank_movement(con, dataset_id, suite_id, query_id, k)


@router.get("/analytics/retriever-battle")
def get_retriever_battle(dataset_id: str = "sample_default", suite_id: str | None = None, k: int = 10):
    with connect() as con:
        return retriever_battle(con, dataset_id, suite_id, k)
