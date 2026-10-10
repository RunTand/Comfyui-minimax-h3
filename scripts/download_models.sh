#!/usr/bin/env bash
# Download Comfy-Org MiniMax-H3 weights into ComfyUI/models.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export INSTALL_DIR="${COMFYUI_DIR:-$ROOT_DIR/ComfyUI}"
export HF_REPO="${HF_REPO:-Comfy-Org/MiniMax-H3}"
export HF_REVISION="${HF_REVISION:-}"

if [[ ! -d "$INSTALL_DIR" ]]; then
  echo "ComfyUI not found at $INSTALL_DIR. Run setup_autodl.sh first." >&2
  exit 1
fi

if [[ -f /etc/network_turbo ]]; then
  # shellcheck disable=SC1091
  source /etc/network_turbo || true
fi

# Default to hf-mirror for CN; override with USE_HF_MIRROR=0
if [[ "${USE_HF_MIRROR:-1}" == "1" ]]; then
  export HF_ENDPOINT="https://hf-mirror.com"
else
  export HF_ENDPOINT="${HF_ENDPOINT:-https://huggingface.co}"
fi
export HF_HUB_ENABLE_HF_TRANSFER="${HF_HUB_ENABLE_HF_TRANSFER:-1}"

python3 -m pip install -U "huggingface_hub>=0.23" >/dev/null

python3 <<'PY'
import os
import shutil
import sys

from huggingface_hub import hf_hub_download, list_repo_files

repo = os.environ.get("HF_REPO", "Comfy-Org/MiniMax-H3")
revision = os.environ.get("HF_REVISION") or None
install_dir = os.environ["INSTALL_DIR"]
models_root = os.path.join(install_dir, "models")

PREFERRED = [
    "diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors",
    "text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
    "vae/minimax_h3_video_vae_fp16.safetensors",
    "vae/minimax_h3_audio_vae_fp32.safetensors",
]
OPTIONAL = [
    "diffusion_models/minimax_h3_ref2va_pruned_int8_convrot.safetensors",
]

PREFIXES = ("diffusion_models/", "text_encoders/", "vae/", "loras/")

try:
    files = set(list_repo_files(repo_id=repo, revision=revision))
except Exception as exc:
    print("Failed to list repo files: %s" % exc, file=sys.stderr)
    print("Tip: check network / HF_ENDPOINT=%s" % os.environ.get("HF_ENDPOINT"), file=sys.stderr)
    sys.exit(1)

wanted = [p for p in PREFERRED if p in files]
for p in OPTIONAL:
    if p in files:
        wanted.append(p)

if len(wanted) < 3:
    print("Preferred names incomplete; scanning safetensors under known folders...")
    for f in sorted(files):
        if f.endswith(".safetensors") and f.startswith(PREFIXES):
            wanted.append(f)
    wanted = sorted(set(wanted))

if not wanted:
    print("No model files found in %s" % repo, file=sys.stderr)
    sys.exit(1)

print("Repo: %s  revision: %s" % (repo, revision or "default"))
print("HF_ENDPOINT: %s" % os.environ.get("HF_ENDPOINT"))
print("Saving under: %s" % models_root)
print("Files: %d" % len(wanted))

for rel in wanted:
    print("-> %s" % rel)
    # Download into models/ preserving diffusion_models/... layout
    path = hf_hub_download(
        repo_id=repo,
        filename=rel,
        revision=revision,
        local_dir=models_root,
    )
    # Some hub versions nest unexpectedly; ensure models/<rel> exists
    dest = os.path.join(models_root, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.abspath(path) != os.path.abspath(dest) and os.path.isfile(path):
        shutil.copy2(path, dest)
    print("   %s" % dest)

print("Done (MiniMax-H3 video weights).")
print("Optional T2I checkpoint: bash scripts/download_t2i.sh")
print("Start WebUI: bash scripts/start_webui.sh")
PY
