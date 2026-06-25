from ir_rag_eval.rag.grounding import cited_doc_ids_from_results


def generate_grounded_answer(query: str, results) -> dict:
    cited = cited_doc_ids_from_results(results)
    evidence = [{"doc_id": result.doc_id, "title": result.title, "snippet": result.text[:240]} for result in results[:3]]
    if not results:
        answer = "No retrieved evidence was found for this query."
    else:
        answer = (
            f"The query '{query}' is supported by the strongest retrieved evidence "
            f"[{cited[0]}]. Additional context is available from [{cited[-1]}]."
        )
    return {"answer_text": answer, "cited_doc_ids": cited, "evidence": evidence}
