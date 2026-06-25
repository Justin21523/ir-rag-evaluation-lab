from fastapi import APIRouter

from ir_rag_eval.analytics import analytics_overview, dataset_profile, query_metrics
from ir_rag_eval.db.connection import connect

router = APIRouter(tags=["analytics"])


@router.get("/analytics/overview")
def get_analytics_overview(dataset_id: str = "sample_default"):
    with connect() as con:
        return analytics_overview(con, dataset_id)


@router.get("/analytics/query-metrics")
def get_query_metrics(dataset_id: str = "sample_default", experiment_id: str | None = None):
    with connect() as con:
        return query_metrics(con, dataset_id, experiment_id)


@router.get("/analytics/dataset-profile")
def get_dataset_profile(dataset_id: str = "sample_default"):
    with connect() as con:
        return dataset_profile(con, dataset_id)


@router.get("/analytics/report-data")
def get_report_data(dataset_id: str = "sample_default"):
    with connect() as con:
        return {"overview": analytics_overview(con, dataset_id), "dataset_profile": dataset_profile(con, dataset_id)}
