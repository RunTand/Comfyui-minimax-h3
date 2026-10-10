export type LlmProviderId = "deepseek" | "kimi" | "glm" | "custom";

export type LlmProviderPreset = {
  id: LlmProviderId;
  label: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
};

/** OpenAI-compatible Chat Completions presets */
export const LLM_PROVIDERS: LlmProviderPreset[] = [
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "kimi",
    label: "Kimi (月之暗面)",
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-128k",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k", "moonshot-v1-auto"],
  },
  {
    id: "glm",
    label: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-flash",
    models: ["glm-4-flash", "glm-4-air", "glm-4", "glm-4-plus"],
  },
  {
    id: "custom",
    label: "自定义 OpenAI 兼容",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: [],
  },
];

export type LlmSettings = {
  activeProvider: LlmProviderId;
  /** per-provider api keys; never sync to cloud */
  apiKeys: Partial<Record<LlmProviderId, string>>;
  /** override base URL / model per provider */
  baseUrls: Partial<Record<LlmProviderId, string>>;
  models: Partial<Record<LlmProviderId, string>>;
};

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  activeProvider: "deepseek",
  apiKeys: {},
  baseUrls: {},
  models: {},
};

export function resolveProvider(settings: LlmSettings) {
  const preset = LLM_PROVIDERS.find((p) => p.id === settings.activeProvider) || LLM_PROVIDERS[0];
  const baseUrl = (settings.baseUrls[preset.id] || preset.baseUrl).replace(/\/$/, "");
  const model = settings.models[preset.id] || preset.defaultModel;
  const apiKey = settings.apiKeys[preset.id] || "";
  return { preset, baseUrl, model, apiKey };
}
