from fastapi import APIRouter, HTTPException

from ir_rag_eval.jobs.manager import create_job, get_job, list_jobs, list_logs, request_cancel, run_background
from ir_rag_eval.api.schemas import DatasetImportJobRequest
from ir_rag_eval.jobs.tasks import run_import_job

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("")
def jobs(job_type: str | None = None, status: str | None = None):
    return list_jobs(job_type=job_type, status=status)


@router.get("/{job_id}")
def job(job_id: str):
    row = get_job(job_id)
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return row


@router.get("/{job_id}/logs")
def logs(job_id: str):
    if not get_job(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    return list_logs(job_id)


@router.post("/{job_id}/cancel")
def cancel(job_id: str):
    if not get_job(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    request_cancel(job_id)
    return job(job_id)


@router.post("/{job_id}/retry")
def retry(job_id: str):
    original = get_job(job_id)
    if not original:
        raise HTTPException(status_code=404, detail="Job not found")
    new_job_id = create_job(original["job_type"], original["config"], parent_job_id=job_id)
    if original["job_type"] == "dataset_import":
        run_background(new_job_id, run_import_job, DatasetImportJobRequest.model_validate(original["config"]))
    return job(new_job_id)
