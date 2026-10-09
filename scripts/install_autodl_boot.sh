#!/usr/bin/env bash
# Optional: write a simple boot helper under /root/start_comfyui_h3.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-/root/start_comfyui_h3.sh}"

cat > "$TARGET" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$ROOT_DIR"
exec bash scripts/start_webui.sh
EOF
chmod +x "$TARGET"
echo "Boot helper written: $TARGET"
echo "You can set AutoDL start command to: bash $TARGET"
