from pathlib import Path
import duckdb

from ir_rag_eval.config import settings
from ir_rag_eval.db.migrations import run_migrations


def connect(db_path: Path | None = None) -> duckdb.DuckDBPyConnection:
    path = db_path or settings.db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(path))
    schema_path = Path(__file__).with_name("schema.sql")
    con.execute(schema_path.read_text(encoding="utf-8"))
    run_migrations(con)
    return con
