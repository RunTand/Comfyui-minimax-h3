import { useEffect, useState } from "react";

type Props = {
  onClose: () => void;
};

export default function SettingsPanel({ onClose }: Props) {
  const [providers, setProviders] = useState<LlmProviderPreset[]>([]);
  const [llm, setLlm] = useState<LlmSettings | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([window.manju.listProviders(), window.manju.loadConfig()]).then(([p, cfg]) => {
      setProviders(p);
      setLlm(cfg.llm);
    });
  }, []);

  if (!llm) return null;

  const active = providers.find((p) => p.id === llm.activeProvider) || providers[0];
  const baseUrl = llm.baseUrls[llm.activeProvider] || active?.baseUrl || "";
  const model = llm.models[llm.activeProvider] || active?.defaultModel || "";
  const apiKey = llm.apiKeys[llm.activeProvider] || "";

  async function save() {
    const next = await window.manju.saveLlmConfig(llm);
    setLlm(next);
    setMsg("已保存到本机（API Key 不会上传）");
  }

  return (
    <div className="modal-backdrop">
      <div className="panel modal">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontFamily: "Syne, sans-serif" }}>模型与 API 设置</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>
        <p className="msg" style={{ marginTop: 0 }}>
          第 1–2 步（剧本 / 分镜人物卡）使用云端大模型 API。支持 DeepSeek、Kimi、智谱 GLM，或任意 OpenAI 兼容接口。
        </p>

        <div className="form-grid">
          <label className="full">
            当前使用的供应商
            <select
              value={llm.activeProvider}
              onChange={(e) =>
                setLlm({ ...llm, activeProvider: e.target.value as LlmProviderId })
              }
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="full">
            API Key（{active?.label}）
            <input
              type="password"
              value={apiKey}
              placeholder="sk-..."
              onChange={(e) =>
                setLlm({
                  ...llm,
                  apiKeys: { ...llm.apiKeys, [llm.activeProvider]: e.target.value },
                })
              }
            />
          </label>

          <label className="full">
            Base URL
            <input
              value={baseUrl}
              onChange={(e) =>
                setLlm({
                  ...llm,
                  baseUrls: { ...llm.baseUrls, [llm.activeProvider]: e.target.value },
                })
              }
            />
          </label>

          <label className="full">
            模型名
            {active?.models?.length ? (
              <select
                value={model}
                onChange={(e) =>
                  setLlm({
                    ...llm,
                    models: { ...llm.models, [llm.activeProvider]: e.target.value },
                  })
                }
              >
                {active.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={model}
                onChange={(e) =>
                  setLlm({
                    ...llm,
                    models: { ...llm.models, [llm.activeProvider]: e.target.value },
                  })
                }
              />
            )}
          </label>
        </div>

        <div className="actions" style={{ marginTop: 18 }}>
          <button type="button" className="btn btn-primary" onClick={save}>
            保存
          </button>
        </div>
        {msg && <p className="msg ok">{msg}</p>}
      </div>
    </div>
  );
}
