def cited_doc_ids_from_results(results) -> list[str]:
    return [result.doc_id for result in results[:2]]
