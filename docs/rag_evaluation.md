# RAG Evaluation

RAG evaluation checks whether generated answers cite retrieved evidence. The lab computes citation coverage, claim-level answer support rate, retrieved context relevance, and a faithfulness checklist.

Answers are split into deterministic claims. Each claim records cited document ids, matching evidence ids, support status, and an unsupported reason. Unsupported claim notes remain reviewer-friendly because deterministic matching should not pretend to be a complete factuality judge.
