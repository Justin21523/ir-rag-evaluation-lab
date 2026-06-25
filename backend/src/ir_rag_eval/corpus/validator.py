from typing import Any
from pydantic import BaseModel, Field


class DocumentRecord(BaseModel):
    doc_id: str
    title: str
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class QueryRecord(BaseModel):
    query_id: str
    query: str
    relevant_doc_ids: list[str]
    metadata: dict[str, Any] = Field(default_factory=dict)
