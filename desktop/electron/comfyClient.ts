import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export type GenMode = "step3" | "step4" | "step5" | "t2v" | "i2v" | "t2i";

export type SimpleGenParams = {
  mode: GenMode;
  prompt: string;
  negative?: string;
  seed?: number;
  width?: number;
  height?: number;
  length?: number;
  steps?: number;
  cfg?: number;
  imagePath?: string;
  imagePath2?: string;
};

function workflowsDir(): string {
  const packaged = path.join(process.resourcesPath, "workflows", "api");
  if (fs.existsSync(packaged)) return packaged;
  return path.resolve(app.getAppPath(), "..", "workflows", "api");
}

function templateFile(mode: GenMode): string {
  const map: Record<GenMode, string> = {
    step3: "step3_images.json",
    step4: "step4_video.json",
    step5: "step5_upscale.json",
    t2v: "t2v.json",
    i2v: "i2v.json",
    t2i: "t2i.json",
  };
  return path.join(workflowsDir(), map[mode]);
}

function loadTemplate(mode: GenMode): { prompt: Record<string, unknown> } {
  const file = templateFile(mode);
  if (!fs.existsSync(file)) {
    throw new Error(`缺少工作流模板: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function deepReplace(value: unknown, map: Record<string, string | number>): unknown {
  if (typeof value === "string") {
    let out = value;
    for (const [k, v] of Object.entries(map)) {
      out = out.split(`{{${k}}}`).join(String(v));
    }
    if (/^-?\d+(\.\d+)?$/.test(out)) {
      return Number(out);
    }
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => deepReplace(v, map));
  if (value && typeof value === "object") {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      obj[k] = deepReplace(v, map);
    }
    return obj;
  }
  return value;
}

export function buildPromptGraph(params: SimpleGenParams): Record<string, unknown> {
  const tpl = loadTemplate(params.mode);
  const seed = params.seed ?? Math.floor(Math.random() * 2_000_000_000);
  const isImage = params.mode === "step3" || params.mode === "t2i";
  const map: Record<string, string | number> = {
    PROMPT: params.prompt,
    NEGATIVE: params.negative ?? "blurry, low quality, deformed, watermark",
    SEED: seed,
    WIDTH: params.width ?? (isImage ? 1024 : 854),
    HEIGHT: params.height ?? (isImage ? 1024 : 480),
    LENGTH: params.length ?? 49,
    STEPS: params.steps ?? 28,
    CFG: params.cfg ?? 5,
    IMAGE_NAME: params.imagePath ? path.basename(params.imagePath) : "",
    IMAGE_NAME_2: params.imagePath2 ? path.basename(params.imagePath2) : "",
  };
  return deepReplace(tpl.prompt, map) as Record<string, unknown>;
}

export class ComfyHttpClient {
  constructor(private baseUrl: string) {}

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, "");
  }

  async systemStats(): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/system_stats`);
    if (!res.ok) throw new Error(`system_stats ${res.status}`);
    return res.json();
  }

  async uploadImage(filePath: string): Promise<string> {
    const buf = fs.readFileSync(filePath);
    const form = new FormData();
    form.append("image", new Blob([new Uint8Array(buf)]), path.basename(filePath));
    form.append("overwrite", "true");
    const res = await fetch(`${this.baseUrl}/upload/image`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(`upload failed ${res.status}`);
    const data = (await res.json()) as { name: string };
    return data.name;
  }

  async queuePrompt(graph: Record<string, unknown>, clientId: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: graph, client_id: clientId }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`queue prompt failed: ${res.status} ${text}`);
    }
    const data = (await res.json()) as { prompt_id: string };
    return data.prompt_id;
  }

  async history(promptId: string): Promise<unknown | null> {
    const res = await fetch(`${this.baseUrl}/history/${promptId}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    return data[promptId] ?? null;
  }

  viewUrl(filename: string, subfolder = "", type = "output") {
    const q = new URLSearchParams({ filename, subfolder, type });
    return `${this.baseUrl}/view?${q.toString()}`;
  }
}
