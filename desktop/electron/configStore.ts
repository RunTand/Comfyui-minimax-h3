import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { DEFAULT_LLM_SETTINGS, LlmSettings } from "./providers";

export type AppConfig = {
  ssh: {
    host?: string;
    port?: number;
    username?: string;
    authType?: "password" | "privateKey";
    privateKeyPath?: string;
    remoteRepoPath?: string;
    localPort?: number;
  };
  llm: LlmSettings;
};

const DEFAULT_CONFIG: AppConfig = {
  ssh: {
    port: 22,
    username: "root",
    authType: "privateKey",
    remoteRepoPath: "~/Comfyui-minimax-h3",
    localPort: 8188,
  },
  llm: { ...DEFAULT_LLM_SETTINGS, apiKeys: {}, baseUrls: {}, models: {} },
};

function configPath() {
  return path.join(app.getPath("userData"), "manju-config.json");
}

export function loadAppConfig(): AppConfig {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), "utf8")) as Partial<AppConfig>;
    return {
      ssh: { ...DEFAULT_CONFIG.ssh, ...(raw.ssh || {}) },
      llm: {
        ...DEFAULT_LLM_SETTINGS,
        ...(raw.llm || {}),
        apiKeys: { ...(raw.llm?.apiKeys || {}) },
        baseUrls: { ...(raw.llm?.baseUrls || {}) },
        models: { ...(raw.llm?.models || {}) },
      },
    };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export function saveAppConfig(cfg: AppConfig) {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), "utf8");
}

export function updateLlmSettings(partial: Partial<LlmSettings>): LlmSettings {
  const cfg = loadAppConfig();
  cfg.llm = {
    ...cfg.llm,
    ...partial,
    apiKeys: { ...cfg.llm.apiKeys, ...(partial.apiKeys || {}) },
    baseUrls: { ...cfg.llm.baseUrls, ...(partial.baseUrls || {}) },
    models: { ...cfg.llm.models, ...(partial.models || {}) },
  };
  saveAppConfig(cfg);
  return cfg.llm;
}
