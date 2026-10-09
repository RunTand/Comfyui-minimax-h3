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
bash scripts/setup_autodl.sh
bash scripts/download_models.sh   # 耗时长、占磁盘
tmux new -s comfy
bash scripts/start_webui.sh
# Ctrl+B D 离开 tmux
```

3. 用控制台「自定义服务」打开 `8188`，或本机 SSH 端口转发访问 WebUI。
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

用户租卡并拿到 SSH 后，客户端可：

1. SSH 连接实例  
2. 检测/执行 `start_webui.sh`  
3. 建立本地 `8188` 隧道  
4. 调用 ComfyUI API 或打开内嵌 WebUI  

此时**不需要**你把镜像上架到公开市场。
