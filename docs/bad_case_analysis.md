# Bad Case Analysis

Bad cases identify retrieval failures that aggregate metrics hide: no relevant document, relevant document ranked too low, lexical-only failure, semantic-only failure, hybrid disagreement, zero result, and high latency.

Each case stores expected and retrieved document ids so reviewers can inspect labels, scoring, and corpus coverage.
