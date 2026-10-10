#!/usr/bin/env bash
# Start ComfyUI WebUI (listen on all interfaces for AutoDL port mapping / SSH tunnel).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="${COMFYUI_DIR:-$ROOT_DIR/ComfyUI}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
HOST="${COMFYUI_HOST:-0.0.0.0}"
PORT="${COMFYUI_PORT:-8188}"

if [[ ! -f "$INSTALL_DIR/main.py" ]]; then
  echo "ComfyUI not found at $INSTALL_DIR. Run setup_autodl.sh first." >&2
  exit 1
fi

cd "$INSTALL_DIR"

# Extra args passthrough: bash scripts/start_webui.sh -- --highvram
EXTRA_ARGS=("$@")

echo "==> Starting ComfyUI WebUI"
echo "    dir:  $INSTALL_DIR"
echo "    bind: http://${HOST}:${PORT}"
echo "    CORS: enabled (desktop / tunnel friendly)"
echo "    AutoDL: map custom port ${PORT}, or SSH tunnel:"
echo "      ssh -L ${PORT}:127.0.0.1:${PORT} -p <ssh_port> <user>@<host>"
echo ""

exec "$PYTHON_BIN" main.py \
  --listen "$HOST" \
  --port "$PORT" \
  --enable-cors-header \
  "${EXTRA_ARGS[@]}"
