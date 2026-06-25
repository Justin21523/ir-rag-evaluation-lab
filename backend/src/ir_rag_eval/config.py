from pathlib import Path
from pydantic import BaseModel


class Settings(BaseModel):
    api_prefix: str = "/api/v1"
    project_root: Path = Path(__file__).resolve().parents[3]
    data_dir: Path = project_root / "data"
    db_path: Path = data_dir / "lab.duckdb"
    sample_dir: Path = data_dir / "sample"


settings = Settings()
