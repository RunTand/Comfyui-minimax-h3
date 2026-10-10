# 桌面端联调清单（多 LLM + 私有镜像）

## 准备

- [ ] AutoDL 私有镜像已保存（含步骤 3–5 模型与工作流）
- [ ] 申请至少一个 LLM Key：DeepSeek / Kimi / 智谱 GLM
- [ ] `cd desktop && npm install && npm run electron:dev`

## 检查

- [ ] API 设置可切换供应商并保存 Key
- [ ] 步骤 1：小说 → 剧本 JSON
- [ ] 步骤 2：剧本 → 人物卡 + 分镜
- [ ] SSH 连接私有镜像，ComfyUI 就绪
- [ ] 步骤 3 / 4 / 5 能提交工作流并出结果
- [ ] ComfyUI 模式 iframe 可用

## 注意

- 步骤 3 生成的图若要给步骤 4 用，请先下载到本地再「选择场景图/定妆图」上传。
- `step5_upscale.json` 默认为图像超分占位，可在镜像中换成视频超分后覆盖模板。
