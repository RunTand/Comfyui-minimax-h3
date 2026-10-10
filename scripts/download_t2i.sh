#!/usr/bin/env bash
# Download a local SDXL checkpoint for simple-mode text-to-image.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export INSTALL_DIR="${COMFYUI_DIR:-$ROOT_DIR/ComfyUI}"

if [[ ! -d "$INSTALL_DIR" ]]; then
  echo "ComfyUI not found at $INSTALL_DIR. Run setup_autodl.sh first." >&2
  exit 1
fi

if [[ -f /etc/network_turbo ]]; then
  # shellcheck disable=SC1091
  source /etc/network_turbo || true
fi

if [[ "${USE_HF_MIRROR:-1}" == "1" ]]; then
  export HF_ENDPOINT="https://hf-mirror.com"
else
  export HF_ENDPOINT="${HF_ENDPOINT:-https://huggingface.co}"
fi

python3 -m pip install -U "huggingface_hub>=0.23" >/dev/null

python3 <<'PY'
import os
from huggingface_hub import hf_hub_download

install_dir = os.environ["INSTALL_DIR"]
dest_dir = os.path.join(install_dir, "models", "checkpoints")
os.makedirs(dest_dir, exist_ok=True)

# Compact SDXL for T2I simple mode (filename must match workflows/api/t2i.json)
repo = os.environ.get("T2I_HF_REPO", "stabilityai/stable-diffusion-xl-base-1.0")
filename = os.environ.get("T2I_HF_FILE", "sd_xl_base_1.0.safetensors")

print("Downloading T2I checkpoint")
print("  repo:", repo)
print("  file:", filename)
print("  HF_ENDPOINT:", os.environ.get("HF_ENDPOINT"))

path = hf_hub_download(
    repo_id=repo,
    filename=filename,
    local_dir=dest_dir,
)
print("Saved:", path)
print("Done. Simple-mode 文生图 expects:", os.path.join(dest_dir, filename))
PY
