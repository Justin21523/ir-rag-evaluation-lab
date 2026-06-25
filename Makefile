PYTHON ?= $(shell command -v python3.12 || command -v python3.11 || command -v python3)
VENV := backend/.venv
PY := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
VERSION ?= local
LICENSE ?= unknown

.PHONY: install install-backend install-frontend sample-data index evaluate report load-beir load-msmarco load-openalex api frontend dev test test-backend test-frontend docker-up docker-down

install: install-backend install-frontend

install-backend:
	$(PYTHON) -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 'Python 3.11+ is required')"
	$(PYTHON) -m venv $(VENV)
	$(PIP) install -U pip
	$(PIP) install -e "backend[dev]"

install-frontend:
	cd frontend && npm install

sample-data:
	$(PY) -m ir_rag_eval.cli sample-data

index:
	$(PY) -m ir_rag_eval.cli index

evaluate:
	$(PY) -m ir_rag_eval.cli evaluate $(if $(DATASET_ID),--dataset-id $(DATASET_ID),)

report:
	$(PY) -m ir_rag_eval.cli report $(if $(DATASET_ID),--dataset-id $(DATASET_ID),)

evaluate-batch:
	curl -s -X POST http://127.0.0.1:8300/api/v1/experiments/run-batch \
		-H 'content-type: application/json' \
		-d '{"dataset_id":"$(DATASET_ID)","retrievers":["bm25","dense","hybrid","rerank"],"k_values":[1,3,5,10],"alpha":0.5,"dense_backend":"auto"}'

ingest-beir-job:
	curl -s -X POST http://127.0.0.1:8300/api/v1/corpus/datasets/import-job \
		-H 'content-type: application/json' \
		-d '{"dataset_id":"$(NAME)","name":"$(NAME)","dataset_type":"beir","preset":"$(PRESET)","input_path":"$(INPUT)","version":"$(VERSION)","license":"$(LICENSE)","resume":true,"batch_size":1000}'

ingest-msmarco-job:
	curl -s -X POST http://127.0.0.1:8300/api/v1/corpus/datasets/import-job \
		-H 'content-type: application/json' \
		-d '{"dataset_id":"$(NAME)","name":"$(NAME)","dataset_type":"msmarco","input_path":"$(INPUT)","version":"$(VERSION)","license":"$(LICENSE)","resume":true,"batch_size":1000}'

ingest-openalex-job:
	curl -s -X POST http://127.0.0.1:8300/api/v1/corpus/datasets/import-job \
		-H 'content-type: application/json' \
		-d '{"dataset_id":"$(NAME)","name":"$(NAME)","dataset_type":"openalex","input_path":"$(INPUT)","version":"$(VERSION)","license":"$(LICENSE)","resume":true,"batch_size":1000}'

load-beir:
	$(PY) -m ir_rag_eval.cli load-dataset --dataset beir --input $(INPUT) --output $(OUTPUT) $(if $(LIMIT_DOCS),--limit-docs $(LIMIT_DOCS),) $(if $(LIMIT_QUERIES),--limit-queries $(LIMIT_QUERIES),)

load-msmarco:
	$(PY) -m ir_rag_eval.cli load-dataset --dataset msmarco --input $(INPUT) --output $(OUTPUT) $(if $(LIMIT_DOCS),--limit-docs $(LIMIT_DOCS),) $(if $(LIMIT_QUERIES),--limit-queries $(LIMIT_QUERIES),)

load-openalex:
	$(PY) -m ir_rag_eval.cli load-dataset --dataset openalex --input $(INPUT) --output $(OUTPUT) $(if $(QUERIES),--queries $(QUERIES),) $(if $(LIMIT_DOCS),--limit-docs $(LIMIT_DOCS),)

ingest-beir:
	$(PY) -m ir_rag_eval.cli load-dataset --dataset beir --input $(INPUT) --output data/processed/$(NAME) $(if $(LIMIT_DOCS),--limit-docs $(LIMIT_DOCS),) $(if $(LIMIT_QUERIES),--limit-queries $(LIMIT_QUERIES),)
	$(PY) -m ir_rag_eval.cli ingest-dataset --dataset beir --dataset-id $(NAME) --name $(NAME) --version $(VERSION) --license $(LICENSE) --input data/processed/$(NAME) --resume

ingest-msmarco:
	$(PY) -m ir_rag_eval.cli load-dataset --dataset msmarco --input $(INPUT) --output data/processed/$(NAME) $(if $(LIMIT_DOCS),--limit-docs $(LIMIT_DOCS),) $(if $(LIMIT_QUERIES),--limit-queries $(LIMIT_QUERIES),)
	$(PY) -m ir_rag_eval.cli ingest-dataset --dataset msmarco --dataset-id $(NAME) --name $(NAME) --version $(VERSION) --license $(LICENSE) --input data/processed/$(NAME) --resume

ingest-openalex:
	$(PY) -m ir_rag_eval.cli load-dataset --dataset openalex --input $(INPUT) --output data/processed/$(NAME) $(if $(QUERIES),--queries $(QUERIES),) $(if $(LIMIT_DOCS),--limit-docs $(LIMIT_DOCS),)
	$(PY) -m ir_rag_eval.cli ingest-dataset --dataset openalex --dataset-id $(NAME) --name $(NAME) --version $(VERSION) --license $(LICENSE) --input data/processed/$(NAME) --resume

api:
	$(PY) -m uvicorn ir_rag_eval.api.main:app --app-dir backend/src --host 127.0.0.1 --port 8000 --reload

frontend:
	cd frontend && npm run dev

dev:
	@$(MAKE) -j2 api frontend

test: test-backend test-frontend

test-backend:
	$(PY) -m pytest backend/tests

test-frontend:
	cd frontend && npm test

docker-up:
	docker compose up --build

docker-down:
	docker compose down
