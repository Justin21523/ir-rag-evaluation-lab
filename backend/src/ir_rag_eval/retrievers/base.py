from dataclasses import dataclass, field

from ir_rag_eval.corpus.validator import DocumentRecord


@dataclass
class SearchResult:
    doc_id: str
    title: str
    text: str
    score: float
    rank: int = 0
    score_breakdown: dict[str, float] = field(default_factory=dict)


class Retriever:
    name = "base"

    def search(self, query: str, k: int = 10, **kwargs) -> list[SearchResult]:
        raise NotImplementedError


def rows_to_documents(rows: list[tuple]) -> list[DocumentRecord]:
    import json

    return [
        DocumentRecord(doc_id=row[0], title=row[1], text=row[2], metadata=json.loads(row[3] or "{}"))
        for row in rows
    ]
