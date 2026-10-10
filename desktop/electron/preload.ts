import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("manju", {
  connect: (payload: unknown) => ipcRenderer.invoke("ssh:connect", payload),
  disconnect: () => ipcRenderer.invoke("ssh:disconnect"),
  probe: () => ipcRenderer.invoke("ssh:probe"),
  startComfy: () => ipcRenderer.invoke("ssh:startComfy"),
  status: () => ipcRenderer.invoke("ssh:status"),
  openComfyExternal: () => ipcRenderer.invoke("app:openComfy"),
  pickPrivateKey: () => ipcRenderer.invoke("dialog:pickPrivateKey"),
  pickImage: () => ipcRenderer.invoke("dialog:pickImage"),
  generate: (params: unknown) => ipcRenderer.invoke("comfy:generate", params),
  loadConfig: () => ipcRenderer.invoke("config:load"),
  saveSshConfig: (cfg: unknown) => ipcRenderer.invoke("config:saveSsh", cfg),
  saveLlmConfig: (cfg: unknown) => ipcRenderer.invoke("config:saveLlm", cfg),
  listProviders: () => ipcRenderer.invoke("llm:providers"),
  llmScript: (novel: string) => ipcRenderer.invoke("llm:script", novel),
  llmBreakdown: (scriptText: string) => ipcRenderer.invoke("llm:breakdown", scriptText),
  onProgress: (cb: (payload: unknown) => void) => {
    const listener = (_: Electron.IpcRendererEvent, payload: unknown) => cb(payload);
    ipcRenderer.on("comfy:progress", listener);
    return () => ipcRenderer.removeListener("comfy:progress", listener);
  },
});
