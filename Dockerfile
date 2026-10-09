# Optional local/self-host image. AutoDL cannot import this directly.
# Build: docker build -t comfyui-minimax-h3 .
# Run:   docker run --gpus all -p 8188:8188 -v comfy-models:/workspace/comfyui-minimax-h3/ComfyUI/models comfyui-minimax-h3

FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    COMFYUI_HOST=0.0.0.0 \
    COMFYUI_PORT=8188 \
    USE_HF_MIRROR=0

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    wget \
    curl \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace/comfyui-minimax-h3
COPY . .

RUN sed -i 's/\r$//' scripts/*.sh && chmod +x scripts/*.sh \
    && bash scripts/setup_autodl.sh

EXPOSE 8188

# Models are not baked in (too large). Mount a volume or run download_models.sh once.
CMD ["bash", "scripts/start_webui.sh"]
