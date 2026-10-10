import { useEffect, useState } from "react";

type GenMode = "t2v" | "i2v" | "t2i";

type Job = {
  id: string;
  mode: GenMode;
  prompt: string;
  status: "queued" | "running" | "done" | "error";
  message?: string;
  outputs?: OutputItem[];
};

const MODE_LABEL: Record<GenMode, string> = {
  t2v: "文生视频",
  i2v: "图生视频",
  t2i: "文生图",
};

type Props = {
  comfyReady: boolean;
  statusText?: string;
};

export default function SimpleMode({ comfyReady, statusText }: Props) {
  const [mode, setMode] = useState<GenMode>("t2v");
  const [prompt, setPrompt] = useState("夜雨街道，霓虹倒影，镜头缓慢前推，城市氛围感");
  const [negative, setNegative] = useState("blurry, low quality, watermark");
  const [seed, setSeed] = useState<number>(-1);
  const [width, setWidth] = useState(1344);
  const [height, setHeight] = useState(768);
  const [length, setLength] = useState(81);
  const [steps, setSteps] = useState(28);
  const [cfg, setCfg] = useState(5);
  const [imagePath, setImagePath] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [liveMsg, setLiveMsg] = useState(statusText || "");

  useEffect(() => {
    setLiveMsg(statusText || "");
  }, [statusText]);

  useEffect(() => {
    return window.manju.onProgress((payload: any) => {
      if (payload?.message) setLiveMsg(String(payload.message));
    });
  }, []);

  useEffect(() => {
    if (mode === "t2i") {
      setWidth(1024);
      setHeight(1024);
    } else {
      setWidth(1344);
      setHeight(768);
    }
  }, [mode]);

  async function onGenerate() {
    if (!comfyReady) {
      setLiveMsg("请先启动并确认 ComfyUI 就绪");
      return;
    }
    if (!prompt.trim()) {
      setLiveMsg("请填写提示词");
      return;
    }
    if (mode === "i2v" && !imagePath) {
      setLiveMsg("图生视频请先选择参考图");
      return;
    }

    const id = `${Date.now()}`;
    const job: Job = { id, mode, prompt, status: "running", message: "提交中..." };
    setJobs((prev) => [job, ...prev]);
    setBusy(true);
    try {
      const result = await window.manju.generate({
        mode,
        prompt,
        negative,
        seed: seed < 0 ? undefined : seed,
        width,
        height,
        length,
        steps,
        cfg,
        imagePath: imagePath || undefined,
      });
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? { ...j, status: "done", message: "完成", outputs: result.outputs }
            : j,
        ),
      );
      setLiveMsg("生成完成");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: "error", message } : j)));
      setLiveMsg(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="main studio">
      <section className="studio-left">
        <div className="tabs">
          {(Object.keys(MODE_LABEL) as GenMode[]).map((m) => (
            <button key={m} type="button" className={mode === m ? "active" : ""} onClick={() => setMode(m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <textarea
          className="prompt-box"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述画面、运动、光影、台词或氛围..."
        />

        <label>
          负向提示词
          <input value={negative} onChange={(e) => setNegative(e.target.value)} />
        </label>

        {mode === "i2v" && (
          <label>
            参考图
            <div className="row">
              <input style={{ flex: 1 }} value={imagePath} readOnly placeholder="未选择" />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={async () => {
                  const p = await window.manju.pickImage();
                  if (p) setImagePath(p);
                }}
              >
                选择图片
              </button>
            </div>
          </label>
        )}

        <div className="params">
          <label>
            宽
            <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </label>
          <label>
            高
            <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} />
          </label>
          {mode !== "t2i" ? (
            <label>
              帧数
              <input type="number" value={length} onChange={(e) => setLength(Number(e.target.value))} />
            </label>
          ) : (
            <label>
              Steps
              <input type="number" value={steps} onChange={(e) => setSteps(Number(e.target.value))} />
            </label>
          )}
          <label>
            种子(-1随机)
            <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
          </label>
        </div>

        {mode === "t2i" && (
          <label>
            CFG
            <input type="number" value={cfg} onChange={(e) => setCfg(Number(e.target.value))} />
          </label>
        )}

        <div className="actions">
          <button className="btn btn-primary" type="button" disabled={busy || !comfyReady} onClick={onGenerate}>
            {busy ? "生成中..." : "生成"}
          </button>
          <span className="msg">{liveMsg}</span>
        </div>
      </section>

      <aside className="studio-right queue">
        <h3>任务与结果</h3>
        {jobs.length === 0 && <p className="msg">生成后的图片/视频会显示在这里。</p>}
        {jobs.map((job) => (
          <div className="job" key={job.id}>
            <div className="meta">
              {MODE_LABEL[job.mode]} · {job.status}
              {job.message ? ` · ${job.message}` : ""}
            </div>
            <div style={{ marginBottom: 8 }}>{job.prompt}</div>
            <div className="preview">
              {job.outputs?.map((o) =>
                o.kind === "video" ? (
                  <video key={o.url} src={o.url} controls />
                ) : (
                  <img key={o.url} src={o.url} alt={o.filename} />
                ),
              )}
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
