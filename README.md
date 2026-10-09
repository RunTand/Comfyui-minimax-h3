# ComfyUI + MiniMax-H3（本地 WebUI）

在 Linux / AutoDL 上快速部署 **ComfyUI WebUI**，并预置 **MiniMax-H3** 本地推理所需目录与下载脚本。

> 本仓库发布的是**安装与启动方案**（脚本 + 文档）。  
> AutoDL **不能**直接从 GitHub 导入 Docker 镜像；正确做法是：在 AutoDL 实例里跑本仓库脚本 → 关机 → **保存镜像** →（可选）再到 [AutoDL.Art](https://www.autodl.art) 申请上架。

## 功能

- ComfyUI ≥ `0.30.0`（原生支持 MiniMax H3 T2V / I2V / R2V 模板）
- 浏览器 WebUI（默认端口 `8188`）
- 一键下载 Comfy-Org 量化权重到正确目录
- 面向 AutoDL 的一键安装 / 启动脚本

**本地推理不需要 MiniMax API Key**（算力在你租的 GPU 上）。若工作流使用云端 Partner/API 节点，则另需对应账号积分。

## 硬件建议

| 项目 | 建议 |
|------|------|
| GPU | 单卡大显存（如 24GB+；H3 视频更吃显存，优先 4090/48G 等） |
| 磁盘 | 系统盘预留 ≥ 80GB（权重约 40GB+，另加 ComfyUI 与输出） |
| 系统 | Linux + NVIDIA 驱动 + CUDA |

请遵守 [MiniMax H3 Community License](https://huggingface.co/MiniMaxAI/MiniMax-H3)。部分地区有使用限制，商用请自行确认授权。

## 快速开始（AutoDL）

```bash
# 建议：网络加速（AutoDL 常见）
source /etc/network_turbo 2>/dev/null || true

cd /root
git clone https://github.com/RunTand/Comfyui-minimax-h3.git
cd Comfyui-minimax-h3

bash scripts/setup_autodl.sh
# 下载权重（体积大，耗时长）
bash scripts/download_models.sh

# 启动 WebUI（前台；长期跑建议放到 tmux）
bash scripts/start_webui.sh
```

启动后：

1. AutoDL 控制台打开自定义服务 / 映射端口（默认 `8188`），或使用 SSH 隧道：  
   `ssh -L 8188:127.0.0.1:8188 -p <端口> <用户>@<主机>`
2. 浏览器打开 WebUI → **Template Library → Video** → 选择 MiniMax H3 T2V / I2V / R2V
3. 按提示确认模型文件已就绪，改提示词后 Queue Prompt

分辨率建议：短边 768，宽高为 32 的倍数；16:9 可用 `1344×768`。避免 `1.0` Megapixels（会超出面积上限）。

## 保存为 AutoDL 私有镜像

1. 停止 ComfyUI（Ctrl+C）与其它服务  
2. 确认密钥未写入镜像；大文件数据集放在 `/root/autodl-tmp`（**不会**进镜像）  
3. 实例**关机** → 更多操作 → **保存镜像**  
4. 之后开新实例时选择「我的镜像」即可复用环境  

公开上架到 Art 市场：见 [docs/AUTODL.md](docs/AUTODL.md)（需平台侧入口/客服，普通账号不一定有「发布应用」按钮）。

## 目录结构

```text
comfyui-minimax-h3/
├── README.md
├── docs/
│   └── AUTODL.md
├── scripts/
│   ├── setup_autodl.sh      # 安装 ComfyUI + 依赖
│   ├── download_models.sh   # 下载 MiniMax-H3 权重
│   └── start_webui.sh       # 启动 WebUI
├── Dockerfile               # 可选：自建 Docker（AutoDL 无法直接导入）
└── workflows/
    └── README.md            # 工作流说明
```

## 本地 Docker（可选）

```bash
docker build -t comfyui-minimax-h3 .
docker run --gpus all -p 8188:8188 -v "$PWD/model-data:/workspace/ComfyUI/models" comfyui-minimax-h3
```

镜像内不捆绑数十 GB 权重；首次请挂载卷并执行 `download_models.sh`，或把已下载的 `models` 挂进去。

## 模型文件（手动对照）

来源：[Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3)

| 组件 | 放置目录 |
|------|----------|
| FL2VA / Ref2VA diffusion | `ComfyUI/models/diffusion_models/` |
| Text encoder | `ComfyUI/models/text_encoders/` |
| Video / Audio VAE | `ComfyUI/models/vae/` |
| 可选 Turbo LoRA | `ComfyUI/models/loras/` |

## 许可证

- 本仓库脚本与文档：MIT（见 `LICENSE`）
- ComfyUI、MiniMax-H3 权重与节点：遵循各自上游许可证
