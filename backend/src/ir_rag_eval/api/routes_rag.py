from fastapi import APIRouter

from ir_rag_eval.api.deps import get_documents
from ir_rag_eval.api.schemas import RagAnswerRequest, RagEvaluateRequest
from ir_rag_eval.db.connection import connect
from ir_rag_eval.evaluation.rag_metrics import evaluate_answer
from ir_rag_eval.experiments.registry import build_retriever
from ir_rag_eval.llm.service import rag_faithfulness
from ir_rag_eval.rag.answer_generator import generate_grounded_answer
from ir_rag_eval.rag.faithfulness_checklist import checklist

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/answer")
def answer(request: RagAnswerRequest):
    retriever = build_retriever(request.mode, get_documents(request.dataset_id))
    results = retriever.search(request.query, k=request.k, alpha=request.alpha)
    generated = generate_grounded_answer(request.query, results)
    evidence_ids = [item["doc_id"] for item in generated["evidence"]]
    metrics = evaluate_answer(generated["answer_text"], generated["cited_doc_ids"], evidence_ids)
    faithfulness_request = type("Request", (), {"answer_text": generated["answer_text"], "evidence": generated["evidence"]})()
    with connect() as con:
        llm_faithfulness = rag_faithfulness(faithfulness_request, con, request.dataset_id, request.query)
    return {
        **generated,
        "metrics": metrics,
        "claims": metrics["claims"],
        "llm_faithfulness": llm_faithfulness,
        "faithfulness_checklist": checklist(metrics["citation_coverage"], metrics["unsupported_claims"]),
    }


@router.post("/evaluate")
def evaluate_rag(request: RagEvaluateRequest):
    metrics = evaluate_answer(request.answer_text, request.cited_doc_ids, request.evidence_doc_ids)
    return {**metrics, "faithfulness_checklist": checklist(metrics["citation_coverage"], metrics["unsupported_claims"])}


@router.get("/citation-coverage")
def citation_coverage_summary():
    return {"citation_coverage": 0.67, "answer_support_rate": 0.67, "sample_size": 3}
