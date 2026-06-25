# API Contract

All API endpoints are prefixed with `/api/v1`.

Search request:

```json
{"query":"string","mode":"bm25","k":10,"alpha":0.5}
```

Evaluate request:

```json
{"retriever_name":"bm25","k_values":[1,3,5,10]}
```

RAG answer request:

```json
{"query":"string","mode":"hybrid","k":5,"alpha":0.5}
```

Batch experiment request:

```json
{"dataset_id":"sample_ir_demo_100","retrievers":["bm25","dense","hybrid","rerank"],"k_values":[1,3,5,10],"alpha":0.5,"dense_backend":"auto"}
```

Import job request:

```json
{"dataset_id":"scifact","name":"SciFact","dataset_type":"beir","preset":"scifact","input_path":"data/raw/beir/scifact","version":"beir","license":"dataset-specific","resume":true,"batch_size":1000}
```
