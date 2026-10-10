# 漫剧工作室（桌面端）

- **1–2 步**：DeepSeek / Kimi（Moonshot）/ 智谱 GLM / 自定义 OpenAI 兼容 API  
- **3–5 步**：SSH 隧道 → 你的 AutoDL 私有镜像 ComfyUI  
- 另提供汉化 ComfyUI 内嵌模式  

## 开发 / 打包

```bash
cd desktop
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set CSC_IDENTITY_AUTO_DISCOVERY=false
npm install
npm run electron:dev
npm run pack
```

产物：`release/ManjuStudio-*-portable.exe`、NSIS 安装包。

## 设置说明

打开 **API 设置**：

1. 选择供应商（DeepSeek / Kimi / GLM / 自定义）  
2. 填写该供应商的 API Key  
3. 可改 Base URL 与模型名  
4. 保存（写入本机 `userData/manju-config.json`）  

可同时保存多家 Key，切换「当前使用的供应商」即可，无需重装。
