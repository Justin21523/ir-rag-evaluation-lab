from pathlib import Path


def column_exists(con, table: str, column: str) -> bool:
    rows = con.execute(f"PRAGMA table_info('{table}')").fetchall()
    return any(row[1] == column for row in rows)


def add_column_if_missing(con, table: str, column: str, declaration: str) -> None:
    if not column_exists(con, table, column):
        con.execute(f"ALTER TABLE {table} ADD COLUMN {column} {declaration}")


def run_migrations(con) -> None:
    add_column_if_missing(con, "documents", "dataset_id", "VARCHAR DEFAULT 'sample_default'")
    add_column_if_missing(con, "queries", "dataset_id", "VARCHAR DEFAULT 'sample_default'")
    add_column_if_missing(con, "experiments", "dataset_id", "VARCHAR DEFAULT 'sample_default'")
    add_column_if_missing(con, "experiments", "suite_id", "VARCHAR")
    add_column_if_missing(con, "search_runs", "dataset_id", "VARCHAR DEFAULT 'sample_default'")
    add_column_if_missing(con, "search_runs", "experiment_id", "VARCHAR")
    add_column_if_missing(con, "search_results", "experiment_id", "VARCHAR")
    add_column_if_missing(con, "search_results", "dataset_id", "VARCHAR DEFAULT 'sample_default'")
    add_column_if_missing(con, "bad_cases", "notes", "VARCHAR")
    add_column_if_missing(con, "bad_cases", "reviewer_label", "VARCHAR")
    add_column_if_missing(con, "bad_cases", "root_cause", "VARCHAR DEFAULT 'unknown'")
    add_column_if_missing(con, "bad_cases", "severity", "VARCHAR DEFAULT 'medium'")
    add_column_if_missing(con, "bad_cases", "owner", "VARCHAR")
    add_column_if_missing(con, "bad_cases", "review_status", "VARCHAR DEFAULT 'open'")
    add_column_if_missing(con, "bad_cases", "llm_suggestion_json", "VARCHAR")
    add_column_if_missing(con, "bad_cases", "llm_review_status", "VARCHAR")
    add_column_if_missing(con, "bad_cases", "llm_updated_at", "TIMESTAMP")
    add_column_if_missing(con, "bad_cases", "updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    add_column_if_missing(con, "jobs", "parent_job_id", "VARCHAR")
    con.execute(Path(__file__).with_name("schema.sql").read_text(encoding="utf-8"))
