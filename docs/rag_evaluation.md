# RAG Evaluation

RAG evaluation checks whether generated answers cite retrieved evidence. The lab computes citation coverage, claim-level answer support rate, retrieved context relevance, and a faithfulness checklist.

Answers are split into deterministic claims. Each claim records cited document ids, matching evidence ids, support status, and an unsupported reason. Unsupported claim notes remain reviewer-friendly because deterministic matching should not pretend to be a complete factuality judge.

When a local llama.cpp server is configured, the RAG page can request an assistive local faithfulness judgment. The local judge labels claims as `supported`, `partially_supported`, `unsupported`, or `contradictory` and returns rationale plus confidence. These labels are reviewer aids and should not replace deterministic citation coverage or human review.

The RAG Citation Checker is a three-column workbench:

- Left: answer claims and support labels.
- Center: evidence documents with highlighted cited evidence.
- Right: local LLM judgment, confidence bar, rationale, citation status, and claim-to-evidence mapping.

Each local judge run is persisted to `llm_runs`, and each claim judgment is persisted to `llm_judgments`. This makes faithfulness review auditable and visible in the LLM Evaluation dashboard.
