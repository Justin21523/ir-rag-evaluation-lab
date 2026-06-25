from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ir_rag_eval.api import (
    routes_analytics,
    routes_bad_cases,
    routes_corpus,
    routes_evaluate,
    routes_experiments,
    routes_health,
    routes_jobs,
    routes_rag,
    routes_search,
)
from ir_rag_eval.config import settings
from ir_rag_eval.logging_config import configure_logging

configure_logging()

app = FastAPI(title="IR / RAG Evaluation Lab API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_health.router, prefix=settings.api_prefix)
app.include_router(routes_jobs.router, prefix=settings.api_prefix)
app.include_router(routes_analytics.router, prefix=settings.api_prefix)
app.include_router(routes_corpus.router, prefix=settings.api_prefix)
app.include_router(routes_search.router, prefix=settings.api_prefix)
app.include_router(routes_evaluate.router, prefix=settings.api_prefix)
app.include_router(routes_experiments.router, prefix=settings.api_prefix)
app.include_router(routes_bad_cases.router, prefix=settings.api_prefix)
app.include_router(routes_rag.router, prefix=settings.api_prefix)
