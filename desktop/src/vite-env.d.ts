/// <reference types="vite/client" />

type ProbeResult = {
  comfyReady: boolean;
  repoPresent: boolean;
  markerPresent: boolean;
  message: string;
};

type LlmProviderId = "deepseek" | "kimi" | "glm" | "custom";

type LlmProviderPreset = {
  id: LlmProviderId;
  label: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
};

type LlmSettings = {
  activeProvider: LlmProviderId;
  apiKeys: Partial<Record<LlmProviderId, string>>;
  baseUrls: Partial<Record<LlmProviderId, string>>;
  models: Partial<Record<LlmProviderId, string>>;
};

type AppConfig = {
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

type GenMode = "step3" | "step4" | "step5" | "t2v" | "i2v" | "t2i";

type OutputItem = {
  kind: "image" | "video";
  url: string;
  filename: string;
};

type CharacterCard = {
  id: string;
  name: string;
  look_prompt: string;
  notes?: string;
};

type ShotCard = {
  id: string;
  scene_prompt: string;
  char_ids: string[];
  motion_prompt: string;
  duration_hint?: number;
  dialogue?: string;
};

type ScriptResult = {
  title?: string;
  logline?: string;
  script: string;
  episodes?: { no: number; title: string; summary: string }[];
};

type BreakdownResult = {
  characters: CharacterCard[];
  shots: ShotCard[];
};

type ManjuApi = {
  connect: (payload: Record<string, unknown>) => Promise<{ ok: boolean; baseUrl: string; probe: ProbeResult }>;
  disconnect: () => Promise<{ ok: boolean }>;
  probe: () => Promise<ProbeResult>;
  startComfy: () => Promise<{ result: string; probe: ProbeResult }>;
  status: () => Promise<{ connected: boolean; baseUrl: string; localPort: number }>;
  openComfyExternal: () => Promise<boolean>;
  pickPrivateKey: () => Promise<string | null>;
  pickImage: () => Promise<string | null>;
  generate: (params: Record<string, unknown>) => Promise<{ promptId: string; outputs: OutputItem[] }>;
  loadConfig: () => Promise<AppConfig>;
  saveSshConfig: (cfg: AppConfig["ssh"]) => Promise<AppConfig>;
  saveLlmConfig: (cfg: Partial<LlmSettings>) => Promise<LlmSettings>;
  listProviders: () => Promise<LlmProviderPreset[]>;
  llmScript: (novel: string) => Promise<ScriptResult>;
  llmBreakdown: (scriptText: string) => Promise<BreakdownResult>;
  onProgress: (cb: (payload: unknown) => void) => () => void;
};

interface Window {
  manju: ManjuApi;
}
