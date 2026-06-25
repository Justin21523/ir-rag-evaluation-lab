SYNONYMS = {
    "citation": ["evidence", "source"],
    "faithful": ["grounded", "supported"],
    "bm25": ["lexical", "baseline"],
    "dense": ["embedding", "semantic"],
}


def expand_query(query: str) -> str:
    additions: list[str] = []
    lowered = query.lower()
    for term, synonyms in SYNONYMS.items():
        if term in lowered:
            additions.extend(synonyms)
    return query if not additions else f"{query} {' '.join(additions)}"
