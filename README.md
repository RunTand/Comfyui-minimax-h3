# 漫剧工作室 · ComfyUI 私有镜像 + 多模型 LLM

流水线分工：

| 步骤 | 在哪跑 | 说明 |
|------|--------|------|
| 1. 小说 → 剧本 | **桌面端云端 API** | DeepSeek / Kimi / 智谱 GLM / 自定义 OpenAI 兼容 |
| 2. 剧本 → 分镜 + 人物卡 | **桌面端云端 API** | 同上，可在设置里切换供应商与 Key |
| 3. 场景图 + 定妆照 | **你的 AutoDL 私有镜像** | ComfyUI `step3_images` |
| 4. 480p 视频 | **私有镜像** | MiniMax-H3 等 `step4_video` |
| 5. 放大变清晰 | **私有镜像** | `step5_upscale`（可换成专用超分） |

仓库：https://github.com/RunTand/Comfyui-minimax-h3

## 一、打造独属私有镜像（步骤 3–5）

```bash
source /etc/network_turbo 2>/dev/null || true
cd /root
git clone https://github.com/RunTand/Comfyui-minimax-h3.git
cd Comfyui-minimax-h3

bash scripts/setup_autodl.sh       # ComfyUI + 中文
bash scripts/download_models.sh    # H3 视频权重
bash scripts/download_t2i.sh       # SDXL（步骤3/5）
bash scripts/start_webui.sh
```

在 ComfyUI 中验证步骤 3–5 工作流后：**关机 → 保存镜像**。以后开卡只选「我的镜像」。

可按你的节点导出 API JSON，覆盖 [`workflows/api/step3_images.json`](workflows/api/step3_images.json) 等文件。

## 二、Windows 桌面端

```bash
cd desktop
# 国内建议设置 ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm install
npm run electron:dev
npm run pack   # release/ManjuStudio-*-portable.exe 等
```

使用顺序：

1. **API 设置**：选择 DeepSeek / Kimi / GLM / 自定义，填写 API Key（只存本机）  
2. **连接 SSH**：连到你的私有镜像实例  
3. **启动远端 ComfyUI**  
4. 按向导走 1→2→3→4→5；或切换 **ComfyUI** 专家模式  

API Key、SSH 密码均不上传到第三方（除你调用的 LLM 厂商与你自己的云机）。

## 目录

```text
├── desktop/                 # Electron 桌面端（多 LLM + 流水线）
├── scripts/                 # 云端安装/下载/启动
├── workflows/api/           # step3/4/5 + 旧 t2i/t2v/i2v
└── docs/
```

详见 [desktop/README.md](desktop/README.md)、[docs/DESKTOP.md](docs/DESKTOP.md)、[workflows/README.md](workflows/README.md)。

## 许可证

MIT（本仓库脚本与桌面端）。ComfyUI、MiniMax-H3、各 LLM API 遵循其各自条款。
