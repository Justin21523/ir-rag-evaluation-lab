from ir_rag_eval.evaluation.evaluator import evaluate_retriever
from ir_rag_eval.experiments.registry import build_retriever


def run_experiment(name: str, documents, queries, k_values: list[int]) -> dict:
    retriever = build_retriever(name, documents)
    return evaluate_retriever(retriever, queries, k_values)
