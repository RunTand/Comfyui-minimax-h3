import { LlmSettings, resolveProvider } from "./providers";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function chatCompletionsUrl(baseUrl: string) {
  if (baseUrl.endsWith("/chat/completions")) return baseUrl;
  if (baseUrl.endsWith("/v1")) return `${baseUrl}/chat/completions`;
  // deepseek official often uses https://api.deepseek.com without /v1
  if (baseUrl.includes("deepseek.com") && !baseUrl.includes("/v1")) {
    return `${baseUrl}/chat/completions`;
  }
  return `${baseUrl}/chat/completions`;
}

export async function chatCompletion(
  settings: LlmSettings,
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const { baseUrl, model, apiKey, preset } = resolveProvider(settings);
  if (!apiKey.trim()) {
    throw new Error(`请先在设置中填写 ${preset.label} 的 API Key`);
  }

  const url = chatCompletionsUrl(baseUrl);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts?.temperature ?? 0.7,
      max_tokens: opts?.maxTokens ?? 8192,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${preset.label} API 失败 (${res.status}): ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("模型返回为空");
  return content;
}

export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] || text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("未能从模型输出中解析 JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

export const SCRIPT_SYSTEM = `你是资深网文改编编剧。把用户给的小说片段改写成适合短漫剧的剧本。
只输出 JSON，不要其它说明。结构：
{
  "title": "剧名",
  "logline": "一句话梗概",
  "script": "完整剧本正文（含场次、对白、动作）",
  "episodes": [{"no":1,"title":"","summary":""}]
}`;

export const BREAKDOWN_SYSTEM = `你是分镜导演与美术设定。根据剧本拆出人物卡与分镜表，供下游 ComfyUI 出图/出视频。
只输出 JSON，不要其它说明。结构：
{
  "characters": [
    {"id":"c1","name":"姓名","look_prompt":"定妆外貌提示词，中英均可，具体服装发型气质","notes":""}
  ],
  "shots": [
    {
      "id":"s01",
      "scene_prompt":"场景图提示词（环境光影构图）",
      "char_ids":["c1"],
      "motion_prompt":"镜头运动与角色动作，供图生视频",
      "duration_hint":5,
      "dialogue":"可选对白"
    }
  ]
}`;
