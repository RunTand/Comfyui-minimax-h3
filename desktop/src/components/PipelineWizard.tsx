import { useEffect, useMemo, useState } from "react";

type Step = 1 | 2 | 3 | 4 | 5;

type Props = {
  comfyReady: boolean;
};

const STEPS: { id: Step; title: string; hint: string }[] = [
  { id: 1, title: "剧本", hint: "云端 LLM：小说 → 剧本" },
  { id: 2, title: "分镜人物卡", hint: "云端 LLM：剧本 → 分镜 + 人物卡" },
  { id: 3, title: "出图", hint: "私有镜像：场景图 + 定妆照" },
  { id: 4, title: "视频 480p", hint: "私有镜像：图生视频" },
  { id: 5, title: "放大", hint: "私有镜像：视频超分" },
];

export default function PipelineWizard({ comfyReady }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [novel, setNovel] = useState("");
  const [scriptJson, setScriptJson] = useState<ScriptResult | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [breakdown, setBreakdown] = useState<BreakdownResult | null>(null);
  const [shotId, setShotId] = useState("");
  const [charId, setCharId] = useState("");
  const [lookImage, setLookImage] = useState("");
  const [sceneImage, setSceneImage] = useState("");
  const [videoSource, setVideoSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [outputs, setOutputs] = useState<OutputItem[]>([]);

  useEffect(() => {
    return window.manju.onProgress((p: any) => {
      if (p?.message) setMsg(String(p.message));
    });
  }, []);

  const shots = breakdown?.shots || [];
  const characters = breakdown?.characters || [];
  const activeShot = useMemo(() => shots.find((s) => s.id === shotId) || shots[0], [shots, shotId]);
  const activeChar = useMemo(
    () => characters.find((c) => c.id === charId) || characters[0],
    [characters, charId],
  );

  useEffect(() => {
    if (shots[0] && !shotId) setShotId(shots[0].id);
  }, [shots, shotId]);
  useEffect(() => {
    if (characters[0] && !charId) setCharId(characters[0].id);
  }, [characters, charId]);

  async function runStep1() {
    setBusy(true);
    setMsg("正在调用云端大模型生成剧本...");
    try {
      const res = await window.manju.llmScript(novel);
      setScriptJson(res);
      setScriptText(res.script || "");
      setMsg(`剧本完成：${res.title || "未命名"}`);
      setStep(2);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runStep2() {
    setBusy(true);
    setMsg("正在拆分镜与人物卡...");
    try {
      const res = await window.manju.llmBreakdown(scriptText);
      setBreakdown(res);
      setMsg(`已生成 ${res.characters?.length || 0} 个人物、${res.shots?.length || 0} 个分镜`);
      setStep(3);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runComfy(mode: "step3" | "step4" | "step5", prompt: string, imagePath?: string, imagePath2?: string) {
    if (!comfyReady) {
      setMsg("请先连接 SSH 并启动远端 ComfyUI（私有镜像）");
      return;
    }
    setBusy(true);
    try {
      const res = await window.manju.generate({
        mode,
        prompt,
        imagePath,
        imagePath2,
        width: mode === "step3" ? 1024 : 854,
        height: mode === "step3" ? 1024 : 480,
        length: 49,
      });
      setOutputs(res.outputs || []);
      setMsg("生成完成");
      if (mode === "step3") {
        const img = res.outputs?.find((o) => o.kind === "image");
        // remote view URL can't be re-uploaded as local path; user can pick saved file if needed
        if (img) setSceneImage(sceneImage || "");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="main studio">
      <section className="studio-left">
        <div className="tabs">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={step === s.id ? "active" : ""}
              onClick={() => setStep(s.id)}
            >
              {s.id}. {s.title}
            </button>
          ))}
        </div>
        <p className="msg" style={{ margin: 0 }}>
          {STEPS.find((s) => s.id === step)?.hint}
        </p>

        {step === 1 && (
          <>
            <textarea
              className="prompt-box"
              value={novel}
              onChange={(e) => setNovel(e.target.value)}
              placeholder="粘贴小说原文或章节..."
            />
            <div className="actions">
              <button className="btn btn-primary" type="button" disabled={busy || !novel.trim()} onClick={runStep1}>
                {busy ? "生成中..." : "生成剧本"}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {scriptJson && (
              <div className="msg ok">
                {scriptJson.title} — {scriptJson.logline}
              </div>
            )}
            <textarea
              className="prompt-box"
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="剧本正文（可编辑）"
            />
            <div className="actions">
              <button className="btn btn-ghost" type="button" onClick={() => setStep(1)}>
                上一步
              </button>
              <button className="btn btn-primary" type="button" disabled={busy || !scriptText.trim()} onClick={runStep2}>
                {busy ? "拆解中..." : "生成分镜与人物卡"}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            {!breakdown && <p className="msg">请先完成第 2 步。</p>}
            {breakdown && (
              <>
                <div className="form-grid">
                  <label>
                    分镜
                    <select value={activeShot?.id || ""} onChange={(e) => setShotId(e.target.value)}>
                      {shots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    人物（定妆）
                    <select value={activeChar?.id || ""} onChange={(e) => setCharId(e.target.value)}>
                      {characters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  场景提示词
                  <textarea
                    className="prompt-box"
                    style={{ minHeight: 100 }}
                    value={activeShot?.scene_prompt || ""}
                    onChange={(e) => {
                      if (!breakdown || !activeShot) return;
                      setBreakdown({
                        ...breakdown,
                        shots: breakdown.shots.map((s) =>
                          s.id === activeShot.id ? { ...s, scene_prompt: e.target.value } : s,
                        ),
                      });
                    }}
                  />
                </label>
                <label>
                  定妆提示词
                  <input
                    value={activeChar?.look_prompt || ""}
                    onChange={(e) => {
                      if (!breakdown || !activeChar) return;
                      setBreakdown({
                        ...breakdown,
                        characters: breakdown.characters.map((c) =>
                          c.id === activeChar.id ? { ...c, look_prompt: e.target.value } : c,
                        ),
                      });
                    }}
                  />
                </label>
                <div className="actions">
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      runComfy("step3", `${activeShot?.scene_prompt || ""}, character: ${activeChar?.look_prompt || ""}`)
                    }
                  >
                    生成场景/定妆图
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={async () => {
                      const p = await window.manju.pickImage();
                      if (p) setLookImage(p);
                    }}
                  >
                    指定定妆图文件
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={async () => {
                      const p = await window.manju.pickImage();
                      if (p) setSceneImage(p);
                    }}
                  >
                    指定场景图文件
                  </button>
                </div>
                <p className="msg">
                  定妆图：{lookImage || "未选"} ｜ 场景图：{sceneImage || "未选"}（生成后请下载到本地再选择，供第 4 步上传）
                </p>
              </>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <label>
              分镜动作/运镜
              <textarea
                className="prompt-box"
                style={{ minHeight: 120 }}
                value={activeShot?.motion_prompt || ""}
                onChange={(e) => {
                  if (!breakdown || !activeShot) return;
                  setBreakdown({
                    ...breakdown,
                    shots: breakdown.shots.map((s) =>
                      s.id === activeShot.id ? { ...s, motion_prompt: e.target.value } : s,
                    ),
                  });
                }}
              />
            </label>
            <div className="actions">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={async () => {
                  const p = await window.manju.pickImage();
                  if (p) setSceneImage(p);
                }}
              >
                选择场景图
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={async () => {
                  const p = await window.manju.pickImage();
                  if (p) setLookImage(p);
                }}
              >
                选择定妆图
              </button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={busy || !sceneImage}
                onClick={() =>
                  runComfy("step4", activeShot?.motion_prompt || activeShot?.scene_prompt || "", sceneImage, lookImage || undefined)
                }
              >
                生成 480p 视频
              </button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <p className="msg">选择第 4 步导出的视频首帧/中间帧作参考，或使用镜像内超分工作流对应输入（当前模板以图片/潜空间超分为主，可按镜像替换 step5_upscale.json）。</p>
            <div className="actions">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={async () => {
                  const p = await window.manju.pickImage();
                  if (p) {
                    setVideoSource(p);
                  }
                }}
              >
                选择待放大素材
              </button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={busy || !videoSource}
                onClick={() => runComfy("step5", "high quality upscale", videoSource)}
              >
                放大变清晰
              </button>
            </div>
            <p className="msg">当前素材：{videoSource || "未选"}</p>
          </>
        )}

        {msg && <p className={`msg ${msg.includes("失败") || msg.includes("Error") ? "error" : "ok"}`}>{msg}</p>}
      </section>

      <aside className="studio-right queue">
        <h3>结果预览</h3>
        {outputs.length === 0 && <p className="msg">生成结果会显示在这里。</p>}
        {outputs.map((o) => (
          <div className="job" key={o.url}>
            <div className="meta">{o.filename}</div>
            <div className="preview">
              {o.kind === "video" ? <video src={o.url} controls /> : <img src={o.url} alt={o.filename} />}
            </div>
          </div>
        ))}
        {breakdown && (
          <div className="job">
            <div className="meta">人物卡 {characters.length} · 分镜 {shots.length}</div>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "var(--muted)", margin: 0 }}>
              {JSON.stringify({ characters, shots }, null, 2).slice(0, 2000)}
            </pre>
          </div>
        )}
      </aside>
    </div>
  );
}
