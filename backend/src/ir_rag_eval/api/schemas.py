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
    suite_id: str | None = None
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
    root_cause: Literal["tokenization", "entity_mismatch", "semantic_drift", "missing_corpus", "poor_qrels", "reranker_issue", "unknown"] | None = None
    severity: Literal["low", "medium", "high"] | None = None
    owner: str | None = None
    review_status: Literal["open", "reviewed", "fixed"] | None = None
    llm_review_status: Literal["suggested", "accepted", "rejected", "edited"] | None = None


class BadCaseSuggestionRequest(BaseModel):
    case_id: str


class QueryRewriteRequest(BaseModel):
    dataset_id: str = "sample_default"
    query: str | None = None
    query_id: str | None = None
    mode: Literal["bm25", "dense", "hybrid", "rerank"] = "hybrid"
    k: int = Field(default=10, ge=1, le=50)
    alpha: float = Field(default=0.5, ge=0.0, le=1.0)
    require_real_llm: bool = False


class QueryRewriteExperimentRequest(BaseModel):
    dataset_id: str = "sample_default"
    query_ids: list[str] = Field(default_factory=list)
    limit: int = Field(default=20, ge=1, le=200)
    mode: Literal["bm25", "dense", "hybrid", "rerank"] = "hybrid"
    k: int = Field(default=10, ge=1, le=50)
    alpha: float = Field(default=0.5, ge=0.0, le=1.0)
    require_real_llm: bool = False


class LlmFaithfulnessRequest(BaseModel):
    dataset_id: str = "sample_default"
    answer_text: str
    evidence: list[dict] = Field(default_factory=list)
    require_real_llm: bool = False


class ExperimentNarrativeRequest(BaseModel):
    dataset_id: str = "sample_default"
    require_real_llm: bool = False


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


class EvaluationSuiteRequest(BaseModel):
    dataset_id: str = "sample_default"
    retrievers: list[Literal["bm25", "dense", "hybrid", "rerank"]] = Field(default_factory=lambda: ["bm25", "dense", "hybrid", "rerank"])
    k_values: list[int] = Field(default_factory=lambda: [1, 3, 5, 10])
    name: str | None = None


class LlmSuiteEvaluationRequest(BaseModel):
    dataset_id: str = "sample_default"
    suite_id: str | None = None
    limit_queries: int = Field(default=5, ge=1, le=50)
    require_real_llm: bool = True
