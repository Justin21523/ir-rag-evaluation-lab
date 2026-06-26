#!/usr/bin/env bash
set -uo pipefail

SSH_USER="${SSH_USER:-neojustin}"
SSH_HOST="${SSH_HOST:-neojustin.dothost.net}"
SSH_PORT="${SSH_PORT:-2965}"
REMOTE_ROOT="${REMOTE_ROOT:-/home/${SSH_USER}/ir-rag-evaluation-lab}"
REPO_URL="${REPO_URL:-https://github.com/Justin21523/ir-rag-evaluation-lab.git}"
API_PORT="${API_PORT:-8031}"

: "${SSHPASS:?export SSHPASS before running this script}"
export SSHPASS

SSHO=(-p "$SSH_PORT" -o StrictHostKeyChecking=no -o ConnectTimeout=20 -o ServerAliveInterval=10)

run_ssh() {
  sshpass -e ssh "${SSHO[@]}" "${SSH_USER}@${SSH_HOST}" "$@"
}

ssh_retry() {
  local cmd="$1"
  local n=0
  until run_ssh "$cmd"; do
    n=$((n + 1))
    echo "ssh retry ${n}"
    sleep 6
  done
}

echo "1) Prepare remote checkout"
ssh_retry "mkdir -p '${REMOTE_ROOT}' && if [ -d '${REMOTE_ROOT}/.git' ]; then cd '${REMOTE_ROOT}' && git fetch --all --prune && git checkout main && git pull --ff-only origin main; else rm -rf '${REMOTE_ROOT}' && git clone '${REPO_URL}' '${REMOTE_ROOT}'; fi"

echo "2) Install backend dependencies"
ssh_retry "cd '${REMOTE_ROOT}' && (python3.12 -m venv backend/.venv || python3.11 -m venv backend/.venv || python3 -m venv backend/.venv) && backend/.venv/bin/pip install -U pip && backend/.venv/bin/pip install -e 'backend[textmining]'"

echo "3) Build reproducible demo state"
ssh_retry "cd '${REMOTE_ROOT}' && backend/.venv/bin/python -m ir_rag_eval.cli sample-data && backend/.venv/bin/python -m ir_rag_eval.cli evaluate --dataset-id sample_ir_demo_100 && backend/.venv/bin/python -m ir_rag_eval.cli text-mining --dataset-id sample_ir_demo_100 && backend/.venv/bin/python -m ir_rag_eval.cli report --dataset-id sample_ir_demo_100"

echo "4) Restart uvicorn"
ssh_retry "cd '${REMOTE_ROOT}' && if [ -f api.pid ]; then kill \$(cat api.pid) 2>/dev/null || true; fi && IR_RAG_LLM_PROVIDER=llama_cpp_server IR_RAG_LLM_BASE_URL=http://127.0.0.1:8080/v1 IR_RAG_LLM_MODEL=local-model nohup backend/.venv/bin/python -m uvicorn ir_rag_eval.api.main:app --app-dir backend/src --host 127.0.0.1 --port ${API_PORT} > api.log 2>&1 & echo \$! > api.pid"

echo "5) Health check"
ssh_retry "curl -fsS 'http://127.0.0.1:${API_PORT}/api/v1/health'"

echo "Backend running on remote localhost:${API_PORT}"
