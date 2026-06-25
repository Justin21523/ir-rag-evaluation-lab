import json
from pathlib import Path

from ir_rag_eval.corpus.dataset_loaders import convert_beir, convert_msmarco, convert_openalex
from ir_rag_eval.corpus.loader import load_documents, load_queries


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def test_beir_converter(tmp_path: Path):
    source = tmp_path / "beir"
    out = tmp_path / "out"
    write(source / "corpus.jsonl", json.dumps({"_id": "d1", "title": "Title", "text": "Body"}) + "\n")
    write(source / "queries.jsonl", json.dumps({"_id": "q1", "text": "query"}) + "\n")
    write(source / "qrels" / "test.tsv", "q1\t0\td1\t1\n")
    result = convert_beir(source, out)
    assert result["documents"] == 1
    assert load_queries(out / "queries.jsonl")[0].relevant_doc_ids == ["d1"]


def test_msmarco_converter(tmp_path: Path):
    source = tmp_path / "msmarco"
    out = tmp_path / "out"
    write(source / "collection.tsv", "d1\tpassage body\n")
    write(source / "queries.tsv", "q1\tpassage query\n")
    write(source / "qrels.tsv", "q1\t0\td1\t1\n")
    convert_msmarco(source, out)
    assert load_documents(out / "documents.jsonl")[0].doc_id == "d1"
    assert load_queries(out / "queries.jsonl")[0].relevant_doc_ids == ["d1"]


def test_openalex_converter_rebuilds_abstract(tmp_path: Path):
    source = tmp_path / "works.jsonl"
    out = tmp_path / "out"
    row = {"id": "W1", "display_name": "Work", "abstract_inverted_index": {"hello": [0], "world": [1]}, "publication_year": 2025}
    write(source, json.dumps(row) + "\n")
    convert_openalex(source, out)
    assert load_documents(out / "documents.jsonl")[0].text == "hello world"
