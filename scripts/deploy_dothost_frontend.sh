#!/usr/bin/env bash
set -uo pipefail

SSH_USER="${SSH_USER:-neojustin}"
SSH_HOST="${SSH_HOST:-neojustin.dothost.net}"
SSH_PORT="${SSH_PORT:-2965}"
PROJECT_SLUG="ir-rag-evaluation-lab"
REMOTE_DIR="/home/${SSH_USER}/public_html/projects/${PROJECT_SLUG}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${ROOT}/frontend/dist"

: "${SSHPASS:?export SSHPASS before running this script}"
export SSHPASS

SSHO=(-p "$SSH_PORT" -o StrictHostKeyChecking=no -o ConnectTimeout=20 -o ServerAliveInterval=10)
SCPO=(-P "$SSH_PORT" -o StrictHostKeyChecking=no -o ConnectTimeout=20 -o ServerAliveInterval=10)

run_ssh() {
  sshpass -e ssh "${SSHO[@]}" "${SSH_USER}@${SSH_HOST}" "$@"
}

put() {
  local src="$1"
  local dst="$2"
  local n=0
  until sshpass -e scp "${SCPO[@]}" "$src" "${SSH_USER}@${SSH_HOST}:${dst}"; do
    n=$((n + 1))
    echo "retry ${n}: ${src}"
    sleep 5
  done
  echo "ok: ${dst}"
}

echo "1) Build project-scoped frontend"
(
  cd "${ROOT}/frontend"
  VITE_BASE_PATH="/projects/${PROJECT_SLUG}/" npm run build
)

echo "2) Write deployment runtime config"
cat > "${DIST}/config.js" <<'CONFIG'
window.__IR_RAG_EVAL_CONFIG__ = {
  apiBaseUrl: "/projects/ir-rag-evaluation-lab/api/v1"
};
CONFIG

echo "3) Ensure remote directories"
until run_ssh "mkdir -p '${REMOTE_DIR}/assets'"; do
  echo "retry mkdir"
  sleep 5
done

echo "4) Upload top-level files one by one"
find "$DIST" -maxdepth 1 -type f | sort | while read -r file; do
  put "$file" "${REMOTE_DIR}/$(basename "$file")"
done

echo "5) Upload assets one by one"
find "${DIST}/assets" -type f | sort | while read -r file; do
  put "$file" "${REMOTE_DIR}/assets/$(basename "$file")"
done

echo "Frontend deployed: https://${SSH_HOST}/projects/${PROJECT_SLUG}/"
