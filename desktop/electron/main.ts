import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
} from "electron";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SshTunnelManager, SshConnectInput } from "./sshManager";
import { ComfyHttpClient, SimpleGenParams, buildPromptGraph } from "./comfyClient";
import { loadAppConfig, saveAppConfig, updateLlmSettings } from "./configStore";
import { LLM_PROVIDERS, LlmSettings } from "./providers";
import {
  BREAKDOWN_SYSTEM,
  SCRIPT_SYSTEM,
  chatCompletion,
  extractJsonObject,
} from "./llmClient";

const ssh = new SshTunnelManager();
const comfy = new ComfyHttpClient("http://127.0.0.1:8188");

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1000,
    minHeight: 680,
    backgroundColor: "#0b1210",
    title: "漫剧工作室",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", async () => {
  await ssh.disconnect();
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("config:load", () => loadAppConfig());
ipcMain.handle("config:saveSsh", (_e, sshCfg) => {
  const cfg = loadAppConfig();
  cfg.ssh = { ...cfg.ssh, ...sshCfg };
  saveAppConfig(cfg);
  return cfg;
});
ipcMain.handle("config:saveLlm", (_e, llm: Partial<LlmSettings>) => updateLlmSettings(llm));
ipcMain.handle("llm:providers", () => LLM_PROVIDERS);

ipcMain.handle("llm:script", async (_e, novel: string) => {
  const llm = loadAppConfig().llm;
  const content = await chatCompletion(llm, [
    { role: "system", content: SCRIPT_SYSTEM },
    { role: "user", content: `请改编以下小说内容：\n\n${novel}` },
  ]);
  return extractJsonObject(content);
});

ipcMain.handle("llm:breakdown", async (_e, scriptText: string) => {
  const llm = loadAppConfig().llm;
  const content = await chatCompletion(llm, [
    { role: "system", content: BREAKDOWN_SYSTEM },
    { role: "user", content: `请根据以下剧本拆分镜与人物卡：\n\n${scriptText}` },
  ]);
  return extractJsonObject(content);
});

ipcMain.handle("dialog:pickPrivateKey", async () => {
  const res = await dialog.showOpenDialog({
    title: "选择 SSH 私钥",
    properties: ["openFile"],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  return res.filePaths[0];
});

ipcMain.handle("dialog:pickImage", async () => {
  const res = await dialog.showOpenDialog({
    title: "选择图片",
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "bmp"] }],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  return res.filePaths[0];
});

ipcMain.handle("app:openComfy", async () => {
  await shell.openExternal(ssh.getComfyBaseUrl());
  return true;
});

ipcMain.handle("ssh:status", () => ({
  connected: ssh.isConnected(),
  baseUrl: ssh.getComfyBaseUrl(),
  localPort: ssh.getLocalPort(),
}));

ipcMain.handle("ssh:connect", async (_e, payload) => {
  const input: SshConnectInput = {
    host: payload.host,
    port: Number(payload.port) || 22,
    username: payload.username,
    localPort: Number(payload.localPort) || 8188,
    remoteRepoPath: payload.remoteRepoPath || "~/Comfyui-minimax-h3",
    auth:
      payload.authType === "privateKey"
        ? {
            type: "privateKey",
            privateKeyPath: payload.privateKeyPath,
            passphrase: payload.passphrase,
          }
        : { type: "password", password: payload.password || "" },
  };

  await ssh.connect(input);
  comfy.setBaseUrl(ssh.getComfyBaseUrl());

  const cfg = loadAppConfig();
  cfg.ssh = {
    host: payload.host,
    port: Number(payload.port) || 22,
    username: payload.username,
    authType: payload.authType,
    privateKeyPath: payload.privateKeyPath,
    remoteRepoPath: payload.remoteRepoPath || "~/Comfyui-minimax-h3",
    localPort: Number(payload.localPort) || 8188,
  };
  saveAppConfig(cfg);

  const probe = await ssh.probe();
  return { ok: true, baseUrl: ssh.getComfyBaseUrl(), probe };
});

ipcMain.handle("ssh:disconnect", async () => {
  await ssh.disconnect();
  return { ok: true };
});

ipcMain.handle("ssh:probe", async () => {
  if (!ssh.isConnected()) throw new Error("未连接");
  return ssh.probe();
});

ipcMain.handle("ssh:startComfy", async () => {
  if (!ssh.isConnected()) throw new Error("未连接");
  const result = await ssh.startComfyUi();
  const probe = await ssh.probe();
  return { result, probe };
});

function extractOutputs(historyItem: any): { kind: "image" | "video"; url: string; filename: string }[] {
  const outs: { kind: "image" | "video"; url: string; filename: string }[] = [];
  const outputs = historyItem?.outputs || {};
  for (const nodeId of Object.keys(outputs)) {
    const node = outputs[nodeId];
    for (const key of ["images", "gifs", "videos"] as const) {
      if (!node[key]) continue;
      for (const item of node[key]) {
        outs.push({
          kind: key === "images" ? "image" : "video",
          filename: item.filename,
          url: comfy.viewUrl(item.filename, item.subfolder || "", item.type || "output"),
        });
      }
    }
  }
  return outs;
}

ipcMain.handle("comfy:generate", async (event, params: SimpleGenParams) => {
  if (!ssh.isConnected()) throw new Error("未连接 SSH");

  const send = (payload: unknown) => event.sender.send("comfy:progress", payload);
  send({ stage: "prepare", message: "准备工作流..." });

  const graphParams = { ...params };
  if (params.imagePath && (params.mode === "step4" || params.mode === "step5" || params.mode === "i2v" || params.mode === "step3")) {
    if (params.mode !== "step3" || params.imagePath) {
      // upload reference images when provided
    }
  }
  if (params.imagePath) {
    send({ stage: "upload", message: "上传参考图..." });
    graphParams.imagePath = await comfy.uploadImage(params.imagePath);
  }
  if (params.imagePath2) {
    send({ stage: "upload", message: "上传第二张参考图..." });
    graphParams.imagePath2 = await comfy.uploadImage(params.imagePath2);
  }

  const graph = buildPromptGraph(graphParams);
  const clientId = randomUUID();
  send({ stage: "queue", message: "提交到 ComfyUI..." });
  const promptId = await comfy.queuePrompt(graph, clientId);
  send({ stage: "running", message: "生成中...", promptId });

  const started = Date.now();
  while (Date.now() - started < 30 * 60 * 1000) {
    await new Promise((r) => setTimeout(r, 2000));
    const hist = await comfy.history(promptId);
    if (!hist) continue;
    const status = (hist as any).status;
    const outputs = extractOutputs(hist);
    if (outputs.length > 0 || status?.completed) {
      send({ stage: "done", message: "完成", promptId, outputs });
      return { promptId, outputs };
    }
    if (status?.status_str === "error") {
      throw new Error("ComfyUI 执行失败，请检查镜像内模型与 step 工作流是否匹配");
    }
  }
  throw new Error("生成超时");
});
