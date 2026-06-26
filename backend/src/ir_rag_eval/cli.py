import argparse
import json
from pathlib import Path

from ir_rag_eval.analytics import persist_query_metrics
from ir_rag_eval.config import settings
from ir_rag_eval.corpus.dataset_loaders import convert_dataset
from ir_rag_eval.corpus.dataset_registry import DEFAULT_DATASET_ID, import_jsonl_dataset, register_default_dataset
from ir_rag_eval.corpus.loader import load_documents, load_queries, persist_corpus
from ir_rag_eval.corpus.sample_generator import generate_sample, generate_sample_profiles
from ir_rag_eval.db.connection import connect
from ir_rag_eval.evaluation.bad_case_generator import generate_bad_cases
from ir_rag_eval.evaluation.evaluator import evaluate_retriever_detailed
from ir_rag_eval.experiments.persistence import persist_experiment
from ir_rag_eval.experiments.run_persistence import persist_search_run
from ir_rag_eval.experiments.registry import build_retriever
from ir_rag_eval.experiments.suites import run_evaluation_suite
from ir_rag_eval.llm.service import llm_evaluate_suite
from ir_rag_eval.reporting import build_report
from ir_rag_eval.text_mining import run_text_mining


def cmd_sample_data() -> None:
    generate_sample(settings.sample_dir)
    with connect() as con:
        persist_corpus(
            con,
            load_documents(settings.sample_dir / "documents.jsonl"),
            load_queries(settings.sample_dir / "queries.jsonl"),
            dataset_id=DEFAULT_DATASET_ID,
        )
        register_default_dataset(con)
        for profile in generate_sample_profiles(settings.data_dir):
            import_jsonl_dataset(
                con,
                profile["dataset_id"],
                profile["name"],
                profile["dataset_type"],
                profile["version"],
                profile["license"],
                profile["path"],
                resume=True,
            )
    print(f"Sample data written to {settings.sample_dir}")


def cmd_index() -> None:
    cmd_sample_data()
    with connect() as con:
        for index_type in ["bm25", "dense", "hybrid"]:
            con.execute(
                "INSERT OR REPLACE INTO indexes VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                [f"{index_type}_sample", index_type, json.dumps({"source": "sample"})],
            )
    print("Indexes registered: bm25, dense, hybrid")


def cmd_evaluate(dataset_id: str = DEFAULT_DATASET_ID) -> None:
    from ir_rag_eval.api.deps import get_documents, get_queries
    from ir_rag_eval.corpus.validator import QueryRecord

    documents = get_documents(dataset_id)
    queries = [QueryRecord.model_validate(row) for row in get_queries(dataset_id)]
    with connect() as con:
        for name in ["bm25", "dense", "hybrid", "rerank"]:
            metrics, details = evaluate_retriever_detailed(build_retriever(name, documents), queries, [1, 3, 5, 10])
            experiment_id = persist_experiment(con, f"{name} {dataset_id} evaluation", name, metrics, {"k_values": [1, 3, 5, 10], "dataset_id": dataset_id}, dataset_id=dataset_id)
            for detail in details:
                persist_search_run(
                    con,
                    name,
                    detail["query"].query_id,
                    detail["results"],
                    detail["latency_ms"],
                    {"k_values": [1, 3, 5, 10]},
                    experiment_id=experiment_id,
                    dataset_id=dataset_id,
                )
            persist_query_metrics(con, dataset_id, experiment_id, name, details, [1, 3, 5, 10])
            bad_case_ids = generate_bad_cases(con, experiment_id, details, documents, k=10)
            print(experiment_id, name, metrics)
            if bad_case_ids:
                print("bad_cases", ",".join(bad_case_ids))


def cmd_report(dataset_id: str = DEFAULT_DATASET_ID) -> None:
    with connect() as con:
        report = build_report(con, dataset_id)
    print(f"Reports written to {report['markdown_path']} and {report['html_path']}")


def cmd_text_mining(dataset_id: str = DEFAULT_DATASET_ID, max_terms: int = 80, max_edges: int = 240, limit_docs: int | None = None) -> None:
    with connect() as con:
        result = run_text_mining(con, dataset_id, max_terms=max_terms, max_edges=max_edges, limit_docs=limit_docs)
    print(json.dumps(result, ensure_ascii=False))


BENCHMARK_DATASETS = ["sample_ir_demo_100", "sample_legal_rag_50", "sample_openalex_100", "sample_ecommerce_search_100"]


def cmd_refresh_lab(require_real_llm: bool = True) -> None:
    cmd_sample_data()
    for dataset_id in BENCHMARK_DATASETS:
        suite = run_evaluation_suite(dataset_id, name=f"{dataset_id} refresh-lab suite")
        print(json.dumps({"dataset_id": dataset_id, "suite_id": suite["suite_id"], "experiments": len(suite["experiments"])}, ensure_ascii=False))
        with connect() as con:
            llm_request = type(
                "LlmSuiteEvaluationRequest",
                (),
                {"dataset_id": dataset_id, "suite_id": suite["suite_id"], "limit_queries": 5, "require_real_llm": require_real_llm},
            )()
            llm_result = llm_evaluate_suite(llm_request, con)
            print(json.dumps({"dataset_id": dataset_id, "llm": llm_result["rewrite_experiment"]}, ensure_ascii=False, default=str))
            text_result = run_text_mining(con, dataset_id)
            print(json.dumps({"dataset_id": dataset_id, "text_mining": text_result}, ensure_ascii=False, default=str))
        cmd_report(dataset_id)


def cmd_llm_evaluate(dataset_id: str, suite_id: str | None = None, limit_queries: int = 5, require_real_llm: bool = True) -> None:
    with connect() as con:
        request = type(
            "LlmSuiteEvaluationRequest",
            (),
            {"dataset_id": dataset_id, "suite_id": suite_id, "limit_queries": limit_queries, "require_real_llm": require_real_llm},
        )()
        result = llm_evaluate_suite(request, con)
    print(json.dumps(result, ensure_ascii=False, default=str))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["sample-data", "index", "evaluate", "report", "refresh-lab", "llm-evaluate", "text-mining", "load-dataset", "ingest-dataset"])
    parser.add_argument("--dataset", choices=["beir", "msmarco", "openalex"])
    parser.add_argument("--input", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--queries", type=Path)
    parser.add_argument("--limit-docs", type=int)
    parser.add_argument("--limit-queries", type=int)
    parser.add_argument("--dataset-id", default=DEFAULT_DATASET_ID)
    parser.add_argument("--name")
    parser.add_argument("--version", default="local")
    parser.add_argument("--license", default="unknown")
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--suite-id")
    parser.add_argument("--allow-llm-fallback", action="store_true")
    parser.add_argument("--max-terms", type=int, default=80)
    parser.add_argument("--max-edges", type=int, default=240)
    args = parser.parse_args()
    if args.command == "sample-data":
        cmd_sample_data()
    elif args.command == "index":
        cmd_index()
    elif args.command == "evaluate":
        if not (settings.sample_dir / "documents.jsonl").exists():
            cmd_sample_data()
        cmd_evaluate(args.dataset_id)
    elif args.command == "report":
        cmd_report(args.dataset_id)
    elif args.command == "refresh-lab":
        cmd_refresh_lab(require_real_llm=not args.allow_llm_fallback)
    elif args.command == "llm-evaluate":
        cmd_llm_evaluate(args.dataset_id, args.suite_id, args.limit_queries or 5, require_real_llm=not args.allow_llm_fallback)
    elif args.command == "text-mining":
        cmd_text_mining(args.dataset_id, args.max_terms, args.max_edges, args.limit_docs)
    elif args.command == "load-dataset":
        if not args.dataset or not args.input or not args.output:
            raise SystemExit("load-dataset requires --dataset, --input, and --output")
        result = convert_dataset(args.dataset, args.input, args.output, args.queries, args.limit_docs, args.limit_queries)
        print(json.dumps(result, ensure_ascii=False))
    elif args.command == "ingest-dataset":
        if not args.dataset_id or not args.name or not args.input:
            raise SystemExit("ingest-dataset requires --dataset-id, --name, and --input")
        with connect() as con:
            result = import_jsonl_dataset(
                con,
                args.dataset_id,
                args.name,
                args.dataset or "custom",
                args.version,
                args.license,
                args.input,
                resume=args.resume,
            )
        print(json.dumps(result, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
