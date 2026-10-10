import net from "node:net";
import fs from "node:fs";
import { Client, ConnectConfig } from "ssh2";

export type SshAuth =
  | { type: "password"; password: string }
  | { type: "privateKey"; privateKeyPath: string; passphrase?: string };

export type SshConnectInput = {
  host: string;
  port: number;
  username: string;
  auth: SshAuth;
  localPort?: number;
  remoteHost?: string;
  remotePort?: number;
  remoteRepoPath?: string;
};

export type ProbeResult = {
  comfyReady: boolean;
  repoPresent: boolean;
  markerPresent: boolean;
  message: string;
};

export class SshTunnelManager {
  private client: Client | null = null;
  private server: net.Server | null = null;
  private localPort = 8188;
  private remoteRepoPath = "~/Comfyui-minimax-h3";

  getLocalPort() {
    return this.localPort;
  }

  getComfyBaseUrl() {
    return `http://127.0.0.1:${this.localPort}`;
  }

  isConnected() {
    return Boolean(this.client);
  }

  async connect(input: SshConnectInput): Promise<void> {
    await this.disconnect();

    this.localPort = input.localPort ?? 8188;
    this.remoteRepoPath = input.remoteRepoPath ?? "~/Comfyui-minimax-h3";

    const config: ConnectConfig = {
      host: input.host,
      port: input.port,
      username: input.username,
      readyTimeout: 30000,
      keepaliveInterval: 15000,
    };

    if (input.auth.type === "password") {
      config.password = input.auth.password;
    } else {
      config.privateKey = fs.readFileSync(input.auth.privateKeyPath);
      if (input.auth.passphrase) {
        config.passphrase = input.auth.passphrase;
      }
    }

    this.client = await new Promise<Client>((resolve, reject) => {
      const client = new Client();
      client
        .on("ready", () => resolve(client))
        .on("error", reject)
        .connect(config);
    });

    const remoteHost = input.remoteHost ?? "127.0.0.1";
    const remotePort = input.remotePort ?? 8188;

    this.server = net.createServer((socket) => {
      if (!this.client) {
        socket.destroy();
        return;
      }
      this.client.forwardOut(
        "127.0.0.1",
        0,
        remoteHost,
        remotePort,
        (err, stream) => {
          if (err || !stream) {
            socket.destroy();
            return;
          }
          socket.pipe(stream);
          stream.pipe(socket);
          socket.on("error", () => stream.end());
          stream.on("error", () => socket.destroy());
        },
      );
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(this.localPort, "127.0.0.1", () => resolve());
    });
  }

  async disconnect(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => this.server!.close(() => resolve()));
      this.server = null;
    }
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }

  exec(command: string, timeoutMs = 60000): Promise<{ code: number | null; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error("SSH 未连接"));
        return;
      }
      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        let stdout = "";
        let stderr = "";
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            stream.close();
            reject(new Error(`远端命令超时: ${command}`));
          }
        }, timeoutMs);

        stream
          .on("close", (code: number | null) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({ code, stdout, stderr });
          })
          .on("data", (data: Buffer) => {
            stdout += data.toString("utf8");
          });
        stream.stderr.on("data", (data: Buffer) => {
          stderr += data.toString("utf8");
        });
      });
    });
  }

  async probe(): Promise<ProbeResult> {
    const repo = this.remoteRepoPath;
    const script = [
      `REPO="${repo}"`,
      'REPO_EXPANDED=$(eval echo "$REPO")',
      'if [ -d "$REPO_EXPANDED" ]; then echo REPO=yes; else echo REPO=no; fi',
      'if [ -f "$REPO_EXPANDED/ComfyUI/.comfyui-minimax-h3" ] || [ -f "$REPO_EXPANDED/ComfyUI/main.py" ]; then echo MARKER=yes; else echo MARKER=no; fi',
      'if curl -fsS --max-time 3 http://127.0.0.1:8188/system_stats >/dev/null 2>&1; then echo COMFY=yes; else echo COMFY=no; fi',
    ].join("; ");

    const { stdout } = await this.exec(`bash -lc ${JSON.stringify(script)}`);
    const repoPresent = /REPO=yes/.test(stdout);
    const markerPresent = /MARKER=yes/.test(stdout);
    const comfyReady = /COMFY=yes/.test(stdout);

    let message = "";
    if (!repoPresent) {
      message = "远端未找到仓库，请先按 README 在 AutoDL 执行 git clone 与 setup 脚本。";
    } else if (!comfyReady) {
      message = "仓库已检测到，但 ComfyUI 未在 8188 运行，可尝试一键启动。";
    } else {
      message = "ComfyUI 已就绪，隧道可用。";
    }

    return { comfyReady, repoPresent, markerPresent, message };
  }

  async startComfyUi(): Promise<string> {
    const repo = this.remoteRepoPath;
    const script = [
      `REPO_EXPANDED=$(eval echo "${repo}")`,
      'cd "$REPO_EXPANDED"',
      'if curl -fsS --max-time 2 http://127.0.0.1:8188/system_stats >/dev/null 2>&1; then echo ALREADY; exit 0; fi',
      "if command -v tmux >/dev/null 2>&1; then",
      '  tmux has-session -t manju_comfy 2>/dev/null || tmux new-session -d -s manju_comfy "bash scripts/start_webui.sh"',
      "else",
      '  nohup bash scripts/start_webui.sh > /tmp/manju_comfyui.log 2>&1 &',
      "fi",
      "for i in $(seq 1 30); do",
      "  if curl -fsS --max-time 2 http://127.0.0.1:8188/system_stats >/dev/null 2>&1; then echo STARTED; exit 0; fi",
      "  sleep 2",
      "done",
      "echo FAILED; exit 1",
    ].join("; ");

    const { stdout, stderr, code } = await this.exec(`bash -lc ${JSON.stringify(script)}`, 90000);
    if (code !== 0 && !/STARTED|ALREADY/.test(stdout)) {
      throw new Error(`启动 ComfyUI 失败: ${stdout || stderr}`);
    }
    return stdout.trim() || "STARTED";
  }
}
