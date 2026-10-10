# AutoDL 使用与「镜像」说明

## 重要限制

- AutoDL **不支持**从 GitHub / Docker Hub **导入**自定义镜像。
- 本仓库在 GitHub 上发布的是**脚本与文档**；可复用的运行环境需要你在 AutoDL 实例内安装后 **保存镜像**。
- 社区「发布应用」入口对普通账号经常不可见；公开上架可咨询 AutoDL.Art 客服。私有复用只需「保存镜像」。

## 推荐流程

1. 在 [AutoDL.Art](https://www.autodl.art) 或 AutoDL 创建 GPU 实例（建议大显存）。
2. SSH 登录后：

```bash
source /etc/network_turbo 2>/dev/null || true
cd /root
git clone https://github.com/RunTand/Comfyui-minimax-h3.git
cd Comfyui-minimax-h3
bash scripts/setup_autodl.sh      # 含中文翻译插件
bash scripts/download_models.sh   # H3 视频权重，耗时长
bash scripts/download_t2i.sh      # 文生图 SDXL（桌面简易模式需要）
tmux new -s comfy
bash scripts/start_webui.sh
# Ctrl+B D 离开 tmux
```

3. 用控制台「自定义服务」打开 `8188`，本机 SSH 端口转发，或直接使用仓库内 **桌面端** 填 SSH 连接。
4. 验证 Template Library → Video → MiniMax H3 能跑通一条后：
   - 停止服务
   - **关机** → **保存镜像**
5. 之后新开实例选择「我的镜像」，只需 `bash scripts/start_webui.sh`（或写进开机启动）。

## 系统盘 vs 数据盘

| 路径 | 是否进入「保存的镜像」 |
|------|------------------------|
| `/` 系统盘（如 `/root/comfyui-minimax-h3`、ComfyUI、models） | 是 |
| `/root/autodl-tmp` | 否（放大数据集、临时输出） |

保存前请删除 API Key、SSH 私钥等敏感文件。

## 与桌面客户端配合

推荐流程：本机配置 DeepSeek/Kimi/GLM Key 完成剧本与分镜 → SSH 连**你的私有镜像**跑步骤 3–5。

客户端会：

1. SSH 连接实例  
2. 检测/执行 `start_webui.sh`  
3. 建立本地 `8188` 隧道  
4. 投递 `step3/4/5` API 工作流，或打开内嵌 ComfyUI  

不必上架公开市场；保存「我的镜像」即可独享。
