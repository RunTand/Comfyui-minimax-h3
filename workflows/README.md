# 工作流说明

本仓库不捆绑可能过期的大型 workflow JSON。请使用 ComfyUI 内置模板（需 ComfyUI ≥ 0.30.0）：

1. 启动 WebUI  
2. **Template Library（模板库）→ Video**  
3. 选择：
   - **MiniMax H3 T2V**（文生视频）
   - **MiniMax H3 I2V**（图生视频 / 首尾帧）
   - **MiniMax H3 R2V**（多参考生视频，需 Ref2VA 权重）

跑通后可在界面导出 JSON，放到本目录以便你的产品/团队固定版本：

```text
workflows/
  minimax_h3_t2v.json
  minimax_h3_i2v.json
```

导出给程序调用时，请使用 **API 格式** workflow（与界面格式不同）。

## 分辨率提醒

- 短边 768，宽高对齐 32 的倍数  
- 16:9 原生画布可用 `1344 × 768`  
- 避免 Template 里 `1.0` Megapixels（可能超出 H3-Base 面积上限）
