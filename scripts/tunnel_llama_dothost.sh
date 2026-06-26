#!/usr/bin/env bash
set -uo pipefail

SSH_USER="${SSH_USER:-neojustin}"
SSH_HOST="${SSH_HOST:-neojustin.dothost.net}"
SSH_PORT="${SSH_PORT:-2965}"
LOCAL_LLAMA_HOST="${LOCAL_LLAMA_HOST:-127.0.0.1}"
LOCAL_LLAMA_PORT="${LOCAL_LLAMA_PORT:-8080}"
REMOTE_LLAMA_PORT="${REMOTE_LLAMA_PORT:-8080}"

: "${SSHPASS:?export SSHPASS before running this script}"
export SSHPASS

echo "Reverse tunnel: remote 127.0.0.1:${REMOTE_LLAMA_PORT} -> local ${LOCAL_LLAMA_HOST}:${LOCAL_LLAMA_PORT}"
while true; do
  sshpass -e ssh \
    -p "${SSH_PORT}" \
    -N \
    -R "127.0.0.1:${REMOTE_LLAMA_PORT}:${LOCAL_LLAMA_HOST}:${LOCAL_LLAMA_PORT}" \
    -o StrictHostKeyChecking=no \
    -o ExitOnForwardFailure=yes \
    -o ConnectTimeout=20 \
    -o ServerAliveInterval=10 \
    -o ServerAliveCountMax=3 \
    "${SSH_USER}@${SSH_HOST}"
  echo "tunnel disconnected; retrying in 5s"
  sleep 5
done
