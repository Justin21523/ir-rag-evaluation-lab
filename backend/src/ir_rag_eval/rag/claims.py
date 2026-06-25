import re


CITATION_RE = re.compile(r"\[([A-Za-z0-9_:./-]+)\]")


def split_claims(answer_text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?。！？])\s+", answer_text.strip())
    return [part.strip() for part in parts if part.strip()]


def extract_citations(text: str) -> list[str]:
    return CITATION_RE.findall(text)


def evaluate_claims(answer_text: str, evidence_doc_ids: list[str]) -> list[dict]:
    evidence = set(evidence_doc_ids)
    rows: list[dict] = []
    for idx, claim in enumerate(split_claims(answer_text), start=1):
        cited = extract_citations(claim)
        supported = bool(cited) and bool(set(cited) & evidence)
        rows.append(
            {
                "claim_id": f"claim_{idx:03d}",
                "text": claim,
                "cited_doc_ids": cited,
                "evidence_doc_ids": [doc_id for doc_id in cited if doc_id in evidence],
                "supported": supported,
                "unsupported_reason": "" if supported else "No citation matched retrieved evidence.",
            }
        )
    return rows
