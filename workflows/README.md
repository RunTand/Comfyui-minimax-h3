# 工作流说明（漫剧流水线）

## 桌面流水线对应关系

| 步骤 | 执行方 | 模板 |
|------|--------|------|
| 1 小说→剧本 | DeepSeek / Kimi / GLM 等云端 API | 无 Comfy 模板 |
| 2 剧本→分镜人物卡 | 同上 | 无 Comfy 模板 |
| 3 场景图+定妆照 | 私有镜像 ComfyUI | [`api/step3_images.json`](api/step3_images.json) |
| 4 480p 视频 | 私有镜像 ComfyUI | [`api/step4_video.json`](api/step4_video.json) |
| 5 放大变清晰 | 私有镜像 ComfyUI | [`api/step5_upscale.json`](api/step5_upscale.json) |

在你的 AutoDL 私有镜像中跑通后，可用官方模板导出 API JSON **覆盖**上述文件，只要保留占位符：`{{PROMPT}}`、`{{IMAGE_NAME}}` 等。

兼容旧简易模板：`t2v.json` / `i2v.json` / `t2i.json` 仍保留。

## 镜像建议预装

- ComfyUI ≥ 0.30 + 中文翻译
- SDXL（步骤 3 / 步骤 5 占位）
- MiniMax-H3 权重（步骤 4）
- （推荐）专用视频超分节点替换 step5
