import { useEffect, useMemo, useState } from "react";
import PipelineWizard from "../components/PipelineWizard";
import SettingsPanel from "./SettingsPanel";

type Props = {
  baseUrl: string;
  initialMessage?: string;
  onDisconnect: () => Promise<void>;
};

type UiMode = "pipeline" | "comfy";

export default function StudioPage({ baseUrl, initialMessage, onDisconnect }: Props) {
  const [uiMode, setUiMode] = useState<UiMode>("pipeline");
  const [probeMsg, setProbeMsg] = useState(initialMessage || "");
  const [comfyReady, setComfyReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [providerLabel, setProviderLabel] = useState("");

  async function refreshProbe() {
    const p = await window.manju.probe();
    setProbeMsg(p.message);
    setComfyReady(p.comfyReady);
    return p;
  }

  useEffect(() => {
    refreshProbe().catch(() => undefined);
    window.manju.loadConfig().then(async (cfg) => {
      const providers = await window.manju.listProviders();
      const p = providers.find((x) => x.id === cfg.llm.activeProvider);
      setProviderLabel(p?.label || cfg.llm.activeProvider);
    });
  }, []);

  const iframeSrc = useMemo(() => baseUrl, [baseUrl]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <strong>漫剧工作室</strong>
          <span>
            <i className={`status-dot ${comfyReady ? "on" : ""}`} />
            {comfyReady ? "镜像 ComfyUI 已连接" : "等待 ComfyUI"} · LLM: {providerLabel || "-"}
          </span>
        </div>
        <div className="mode-switch">
          <button className={uiMode === "pipeline" ? "active" : ""} onClick={() => setUiMode("pipeline")} type="button">
            漫剧流水线
          </button>
          <button className={uiMode === "comfy" ? "active" : ""} onClick={() => setUiMode("comfy")} type="button">
            ComfyUI
          </button>
        </div>
        <div className="row">
          <button className="btn btn-ghost" type="button" onClick={() => setShowSettings(true)}>
            API 设置
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await window.manju.startComfy();
                setProbeMsg(r.probe.message);
                setComfyReady(r.probe.comfyReady);
              } catch (e) {
                setProbeMsg(e instanceof Error ? e.message : String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            启动远端 ComfyUI
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => onDisconnect()}>
            断开
          </button>
        </div>
      </header>

      {uiMode === "pipeline" ? (
        <PipelineWizard comfyReady={comfyReady} />
      ) : (
        <div className="comfy-wrap">
          <div className="comfy-toolbar">
            <span style={{ color: "var(--muted)" }}>
              {probeMsg || "汉化 ComfyUI（步骤 3–5 专家模式）"}
            </span>
            <button className="btn btn-ghost" type="button" onClick={() => window.manju.openComfyExternal()}>
              浏览器打开
            </button>
          </div>
          {comfyReady ? (
            <iframe className="comfy-frame" title="ComfyUI" src={iframeSrc} />
          ) : (
            <div className="connect-page">
              <div className="panel">
                <p className="msg">ComfyUI 未就绪，请先启动私有镜像中的服务。</p>
              </div>
            </div>
          )}
        </div>
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
