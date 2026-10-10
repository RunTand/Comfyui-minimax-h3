import { FormEvent, useEffect, useState } from "react";

type Props = {
  onConnected: (info: { baseUrl: string; probe: ProbeResult }) => void;
  onOpenSettings: () => void;
};

export default function ConnectPage({ onConnected, onOpenSettings }: Props) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState("root");
  const [authType, setAuthType] = useState<"password" | "privateKey">("privateKey");
  const [password, setPassword] = useState("");
  const [privateKeyPath, setPrivateKeyPath] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [remoteRepoPath, setRemoteRepoPath] = useState("~/Comfyui-minimax-h3");
  const [localPort, setLocalPort] = useState(8188);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [llmHint, setLlmHint] = useState("");

  useEffect(() => {
    window.manju.loadConfig().then(async (cfg) => {
      if (cfg.ssh.host) setHost(cfg.ssh.host);
      if (cfg.ssh.port) setPort(cfg.ssh.port);
      if (cfg.ssh.username) setUsername(cfg.ssh.username);
      if (cfg.ssh.authType) setAuthType(cfg.ssh.authType);
      if (cfg.ssh.privateKeyPath) setPrivateKeyPath(cfg.ssh.privateKeyPath);
      if (cfg.ssh.remoteRepoPath) setRemoteRepoPath(cfg.ssh.remoteRepoPath);
      if (cfg.ssh.localPort) setLocalPort(cfg.ssh.localPort);
      const providers = await window.manju.listProviders();
      const p = providers.find((x) => x.id === cfg.llm.activeProvider);
      const hasKey = Boolean(cfg.llm.apiKeys[cfg.llm.activeProvider]);
      setLlmHint(
        hasKey
          ? `当前 LLM：${p?.label || cfg.llm.activeProvider}（已配置 Key）`
          : `当前 LLM：${p?.label || cfg.llm.activeProvider}（尚未配置 Key，请先打开 API 设置）`,
      );
    });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("正在连接私有镜像并建立隧道...");
    try {
      const res = await window.manju.connect({
        host,
        port: Number(port),
        username,
        authType,
        password,
        privateKeyPath,
        passphrase,
        remoteRepoPath,
        localPort: Number(localPort),
      });
      setInfo(res.probe.message);
      onConnected(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setInfo("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <strong>漫剧工作室</strong>
          <span>LLM 剧本分镜 · 私有镜像出图出视频</span>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onOpenSettings}>
          API 设置
        </button>
      </header>
      <main className="connect-page">
        <h1 className="hero-title">连接你的私有镜像</h1>
        <p className="hero-sub">
          1–2 步用 DeepSeek / Kimi / GLM 等云端 API；3–5 步（出图、480p 视频、放大）在你 AutoDL 私有镜像的 ComfyUI 上运行。
        </p>
        {llmHint && <p className="msg ok">{llmHint}</p>}
        <form className="panel" onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              主机
              <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="region.autodl.com" required />
            </label>
            <label>
              SSH 端口
              <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} required />
            </label>
            <label>
              用户名
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </label>
            <label>
              认证方式
              <select value={authType} onChange={(e) => setAuthType(e.target.value as "password" | "privateKey")}>
                <option value="privateKey">私钥文件</option>
                <option value="password">密码</option>
              </select>
            </label>
            {authType === "password" ? (
              <label className="full">
                密码
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
            ) : (
              <>
                <label className="full">
                  私钥路径
                  <div className="row">
                    <input
                      style={{ flex: 1 }}
                      value={privateKeyPath}
                      onChange={(e) => setPrivateKeyPath(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={async () => {
                        const p = await window.manju.pickPrivateKey();
                        if (p) setPrivateKeyPath(p);
                      }}
                    >
                      选择
                    </button>
                  </div>
                </label>
                <label className="full">
                  私钥口令（可选）
                  <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
                </label>
              </>
            )}
            <label>
              远端仓库路径
              <input value={remoteRepoPath} onChange={(e) => setRemoteRepoPath(e.target.value)} />
            </label>
            <label>
              本地隧道端口
              <input type="number" value={localPort} onChange={(e) => setLocalPort(Number(e.target.value))} />
            </label>
          </div>
          <div className="actions" style={{ marginTop: 18 }}>
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? "连接中..." : "连接并进入工作室"}
            </button>
          </div>
          {info && <p className="msg ok">{info}</p>}
          {error && <p className="msg error">{error}</p>}
        </form>
      </main>
    </div>
  );
}
