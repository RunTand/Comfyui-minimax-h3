#!/usr/bin/env bash
# Install ComfyUI (>=0.30) for MiniMax-H3 local WebUI on AutoDL / Linux.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="${COMFYUI_DIR:-$ROOT_DIR/ComfyUI}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
ZH_NODE_DIR="$INSTALL_DIR/custom_nodes/AIGODLIKE-ComfyUI-Translation"

echo "==> Repo: $ROOT_DIR"
echo "==> ComfyUI dir: $INSTALL_DIR"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "$PYTHON_BIN not found" >&2
  exit 1
fi

# AutoDL academic network turbo (ignore if missing)
if [[ -f /etc/network_turbo ]]; then
  # shellcheck disable=SC1091
  source /etc/network_turbo || true
fi

if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  echo "==> Cloning ComfyUI..."
  git clone https://github.com/comfyanonymous/ComfyUI.git "$INSTALL_DIR"
else
  echo "==> ComfyUI already present, pulling..."
  git -C "$INSTALL_DIR" fetch --tags --prune
  git -C "$INSTALL_DIR" pull --ff-only || true
fi

cd "$INSTALL_DIR"

# Prefer a recent tag if available; otherwise stay on current branch HEAD.
LATEST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || true)"
if [[ -n "${LATEST_TAG}" ]]; then
  echo "==> Checking out latest tag: $LATEST_TAG"
  git checkout "$LATEST_TAG" || true
fi

echo "==> Installing Python dependencies..."
"$PYTHON_BIN" -m pip install -U pip wheel setuptools
"$PYTHON_BIN" -m pip install -r requirements.txt

# Optional but useful on many AutoDL images
"$PYTHON_BIN" -m pip install -U huggingface_hub hf_transfer || true

mkdir -p \
  models/checkpoints \
  models/diffusion_models \
  models/text_encoders \
  models/vae \
  models/loras \
  models/clip \
  input \
  output \
  custom_nodes

# Chinese UI translation
if [[ ! -d "$ZH_NODE_DIR/.git" ]]; then
  echo "==> Installing Chinese translation (AIGODLIKE-ComfyUI-Translation)..."
  git clone --depth 1 https://github.com/AIGODLIKE/AIGODLIKE-ComfyUI-Translation.git "$ZH_NODE_DIR" \
    || git clone --depth 1 https://ghproxy.net/https://github.com/AIGODLIKE/AIGODLIKE-ComfyUI-Translation.git "$ZH_NODE_DIR" \
    || echo "WARN: failed to clone translation pack; install manually into custom_nodes/" >&2
else
  echo "==> Updating Chinese translation..."
  git -C "$ZH_NODE_DIR" pull --ff-only || true
fi

# Prefer Chinese locale when translation pack is present
if [[ -d "$ZH_NODE_DIR" ]]; then
  mkdir -p "$INSTALL_DIR/user/default"
  cat > "$INSTALL_DIR/user/default/comfy.settings.json" <<'JSON'
{
  "Comfy.Locale": "zh"
}
JSON
fi

# Copy API workflow templates into ComfyUI user area for convenience
if [[ -d "$ROOT_DIR/workflows/api" ]]; then
  mkdir -p "$INSTALL_DIR/user/default/workflows"
  cp -f "$ROOT_DIR/workflows/api/"*.json "$INSTALL_DIR/user/default/workflows/" 2>/dev/null || true
fi

# Lightweight marker for our pack
cat > "$INSTALL_DIR/.comfyui-minimax-h3" <<EOF
installed_from=$ROOT_DIR
comfyui_commit=$(git rev-parse HEAD)
date_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
zh_translation=$([[ -d "$ZH_NODE_DIR" ]] && echo yes || echo no)
EOF

echo ""
echo "Setup done."
echo "Next:"
echo "  bash $ROOT_DIR/scripts/download_models.sh"
echo "  bash $ROOT_DIR/scripts/download_t2i.sh"
echo "  bash $ROOT_DIR/scripts/start_webui.sh"
