import os
from pathlib import Path
from pydantic import BaseModel


class Settings(BaseModel):
    api_prefix: str = "/api/v1"
    project_root: Path = Path(__file__).resolve().parents[3]
    data_dir: Path = project_root / "data"
    db_path: Path = data_dir / "lab.duckdb"
    sample_dir: Path = data_dir / "sample"
    llm_provider: str = os.getenv("IR_RAG_LLM_PROVIDER", "llama_cpp_server")
    llm_base_url: str = os.getenv("IR_RAG_LLM_BASE_URL", "http://127.0.0.1:8080/v1")
    llm_model: str = os.getenv("IR_RAG_LLM_MODEL", "local-model")
    llm_timeout_seconds: float = float(os.getenv("IR_RAG_LLM_TIMEOUT_SECONDS", "60"))
    llm_temperature: float = float(os.getenv("IR_RAG_LLM_TEMPERATURE", "0.0"))
    llm_report_enabled: bool = os.getenv("IR_RAG_LLM_REPORT_ENABLED", "0") == "1"


settings = Settings()
