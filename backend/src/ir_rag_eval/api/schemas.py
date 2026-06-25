from typing import Literal
from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    dataset_id: str = "sample_default"
    query: str
    mode: Literal["bm25", "dense", "hybrid", "rerank"] = "bm25"
    k: int = Field(default=10, ge=1, le=100)
    alpha: float = Field(default=0.5, ge=0.0, le=1.0)


class EvaluateRequest(BaseModel):
    dataset_id: str = "sample_default"
    retriever_name: Literal["bm25", "dense", "hybrid", "rerank"] = "bm25"
    k_values: list[int] = Field(default_factory=lambda: [1, 3, 5, 10])


class RagAnswerRequest(BaseModel):
    dataset_id: str = "sample_default"
    query: str
    mode: Literal["bm25", "dense", "hybrid", "rerank"] = "hybrid"
    k: int = Field(default=5, ge=1, le=20)
    alpha: float = Field(default=0.5, ge=0.0, le=1.0)


class RagEvaluateRequest(BaseModel):
    answer_text: str
    cited_doc_ids: list[str]
    evidence_doc_ids: list[str]


class BadCaseUpdateRequest(BaseModel):
    notes: str | None = None
    reviewer_label: Literal["needs_review", "accepted", "dismissed", "needs_followup"] | None = None


class DatasetIngestRequest(BaseModel):
    dataset_id: str
    name: str
    dataset_type: Literal["beir", "msmarco", "openalex", "sample", "custom"] = "custom"
    version: str = "local"
    license: str = "unknown"
    input_path: str
    resume: bool = True


class DatasetImportJobRequest(DatasetIngestRequest):
    preset: str | None = None
    limit_docs: int | None = None
    limit_queries: int | None = None
    batch_size: int = 1000


class ExperimentBatchRequest(BaseModel):
    dataset_id: str = "sample_default"
    retrievers: list[Literal["bm25", "dense", "hybrid", "rerank"]] = Field(default_factory=lambda: ["bm25", "dense", "hybrid", "rerank"])
    k_values: list[int] = Field(default_factory=lambda: [1, 3, 5, 10])
    alpha: float = Field(default=0.5, ge=0.0, le=1.0)
    dense_backend: Literal["auto", "mock", "sentence-transformers"] = "auto"
