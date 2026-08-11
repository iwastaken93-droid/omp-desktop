import type {
  AgentEvent,
  AgentInfo,
  ChatMessage,
  DiffFile,
  FileNode,
  MemoryEntry,
  PlanTask,
  SessionDetail,
  SessionSummary,
  ThinkingLevel,
  ToolCall,
} from "@omp/shared";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AgentEngine, CreateInput, EngineEventSink, PromptInput } from "./engine";
import { Catalog } from "../catalog";

const PROJECT_ROOT = process.env.OMP_PROJECT_ROOT || process.cwd();
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

interface LiveSession {
  id: string;
  title: string;
  cwd: string;
  createdAt: number;
  updatedAt: number;
  parentId: string | null;
  model?: string;
  messages: ChatMessage[];
  plan: PlanTask[];
  agents: AgentInfo[];
  memory: MemoryEntry[];
  diffs: DiffFile[];
  thinkingLevel: ThinkingLevel;
  planMode: boolean;
  sdk: any; // AgentSession — kept as any to isolate the worker from SDK types
  currentAssistant?: ChatMessage;
  currentToolCalls: Map<string, ToolCall>;
  currentAgents: Map<string, AgentInfo>;
  disposed: boolean;
}

/**
 * Live engine embedding the real @oh-my-pi/pi-coding-agent SDK.
 * Requires Bun >= 1.3.14 and at least one configured provider key.
 */
export class LiveEngine implements AgentEngine {
  readonly kind = "omp" as const;
  readonly name = "OMP Engine (SDK)";

  private sessions = new Map<string, LiveSession>();
  private initPromise: Promise<void> | null = null;
  private sdk: typeof import("@oh-my-pi/pi-coding-agent") | null = null;
  private authStorage: any = null;
  private modelRegistry: any = null;
  private catalog: Catalog | null = null;
  private runtimeKeys = new Map<string, string>();
  private initError: string | null = null;

  constructor(private sink: EngineEventSink) {}

  getEngineHint(): string {
    if (this.initError) return `live engine failed to start: ${this.initError}`;
    return "live omp engine — sessions are driven by the real @oh-my-pi/pi-coding-agent SDK.";
  }

  isUsable(): boolean {
    if (this.initError) return false;
    return this.runtimeKeys.size > 0 || this.providerEnvKeys().length > 0;
  }

  getConfiguredProviders(): number {
    if (this.initError) return 0;
    return this.runtimeKeys.size + this.providerEnvKeys().length;
  }

  // ---------- SDK bootstrap ----------

  private async ensureInit(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      try {
        const sdk = await import("@oh-my-pi/pi-coding-agent");
        this.sdk = sdk;
        this.authStorage = await sdk.discoverAuthStorage();
        this.modelRegistry = new sdk.ModelRegistry(this.authStorage);
        await this.modelRegistry.refresh();
        for (const [provider, key] of this.runtimeKeys) {
          this.authStorage.setRuntimeApiKey(provider, key);
        }
        this.catalog = await Catalog.create(() => this.modelRegistry);
      } catch (err) {
        this.initError = err instanceof Error ? err.message : String(err);
        console.error("[live] engine init failed:", err);
      }
    })();
    return this.initPromise;
  }

  /** Boots the SDK + catalog; returns true when the live engine is usable. */
  async ensureReady(): Promise<boolean> {
    await this.ensureInit();
    return !this.initError;
  }

  /** Registry access for the Catalog (empty when the SDK is unavailable). */
  registry(): { getAll(): unknown[]; getAvailable(): unknown[] } {
    if (!this.modelRegistry) {
      return { getAll: () => [], getAvailable: () => [] };
    }
    return this.modelRegistry;
  }

  setRuntimeKey(provider: string, key: string): boolean {
    const clean = key.trim();
    if (!clean) return false;
    this.runtimeKeys.set(provider, clean);
    if (this.authStorage) {
      this.authStorage.setRuntimeApiKey(provider, clean);
      void this.modelRegistry?.refresh().catch(() => {});
      void this.catalog?.refresh().catch(() => {});
    }
    return true;
  }

  private providerEnvKeys(): string[] {
    const candidates = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "XAI_API_KEY", "DEEPSEEK_API_KEY", "MISTRAL_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY", "TOGETHER_API_KEY", "FIREWORKS_API_KEY", "CEREBRAS_API_KEY", "ZAI_API_KEY", "MOONSHOT_API_KEY", "MINIMAX_API_KEY", "HUGGING_FACE_API_KEY", "NVIDIA_API_KEY", "BASETEN_API_KEY", "NANOGPT_API_KEY", "NOVITA_API_KEY", "VENICE_API_KEY", "KILO_API_KEY", "ZENMUX_API_KEY", "AIMLAPI_API_KEY", "OLLAMA_API_KEY", "GMI_API_KEY", "SILICONFLOW_API_KEY", "WAFER_API_KEY", "SAKANA_API_KEY", "SYNTHETIC_API_KEY", "LITELLM_API_KEY", "COREWEAVE_API_KEY"];
    return candidates.filter((k) => typeof process.env[k] === "string" && process.env[k]!.length > 4);
  }

  private pickModel(id?: string): any {
    if (!this.modelRegistry) return undefined;
    const all = this.modelRegistry.getAll() as any[];
    if (id) {
      const found = all.find((m) => m.id === id) ?? (id.includes("/") ? all.find((m) => `${m.provider}/${m.id}` === id || `${m.provider}/${m.model}` === id) : undefined);
      if (found) return found;
    }
    const available = this.modelRegistry.getAvailable() as any[];
    if (available.length) return available[0];
    return undefined;
  }

  private modelLabel(model: any): string | undefined {
    return model ? String(model.id ?? model.model ?? "") : undefined;
  }

  // ---------- session management ----------

  listSessions(): SessionSummary[] {
    return [...this.sessions.values()]
      .filter((s) => !s.disposed)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((s) => this.summary(s));
  }

  getSessionDetail(id: string): SessionDetail | null {
    const s = this.sessions.get(id);
    if (!s || s.disposed) return null;
    return {
      id: s.id,
      title: s.title,
      cwd: s.cwd,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      model: s.model,
      parentId: s.parentId,
      messages: s.messages,
      plan: s.plan,
      agents: [...s.agents, ...[...s.currentAgents.values()]],
      memory: s.memory,
      diffs: s.diffs,
    };
  }

  resumeSession(id: string): SessionSummary | null {
    const s = this.sessions.get(id);
    return s && !s.disposed ? this.summary(s) : null;
  }

  async createSession(input: CreateInput): Promise<SessionSummary> {
    await this.ensureInit();
    if (!this.sdk || !this.authStorage || !this.modelRegistry) {
      throw new Error("omp SDK unavailable: " + (this.initError ?? "not initialized"));
    }
    const model = this.pickModel(input.model);
    const { session, modelFallbackMessage } = await this.sdk.createAgentSession({
      authStorage: this.authStorage,
      modelRegistry: this.modelRegistry,
      sessionManager: this.sdk.SessionManager.inMemory(),
      cwd: input.cwd || PROJECT_ROOT,
      model,
      enableLsp: true,
      enableMCP: false,
      hasUI: false,
    });
    const id = uid();
    const wrap: LiveSession = {
      id,
      title: input.title || "New session",
      cwd: input.cwd || PROJECT_ROOT,
      createdAt: now(),
      updatedAt: now(),
      parentId: input.parentId ?? null,
      model: this.modelLabel(session.model ?? model),
      messages: [],
      plan: [],
      agents: [],
      memory: [],
      diffs: [],
      thinkingLevel: "medium",
      planMode: false,
      sdk: session,
      currentToolCalls: new Map(),
      currentAgents: new Map(),
      disposed: false,
    };
    this.sessions.set(id, wrap);
    this.wireEvents(id, wrap, session);
    if (modelFallbackMessage) {
      this.sink(id, { type: "notice", message: modelFallbackMessage });
    }
    this.sink(id, { type: "session_created", session: this.info(wrap) });
    return this.summary(wrap);
  }

  renameSession(id: string, title: string): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    s.title = title;
    s.updatedAt = now();
    return true;
  }

  deleteSession(id: string): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    s.disposed = true;
    void s.sdk.dispose().catch(() => {});
    return this.sessions.delete(id);
  }

  // ---------- events wiring ----------

  private wireEvents(id: string, wrap: LiveSession, session: any): void {
    session.subscribe((event: any) => {
      if (wrap.disposed) return;
      switch (event.type) {
        case "turn_start": {
          this.sink(id, { type: "turn_start" });
          break;
        }
        case "message_start": {
          if (event.message?.role === "assistant") {
            const msg: ChatMessage = {
              id: uid(),
              role: "assistant",
              content: "",
              timestamp: now(),
              model: wrap.model,
              streaming: true,
              toolCalls: [],
            };
            wrap.currentAssistant = msg;
            wrap.messages.push(msg);
            this.sink(id, { type: "assistant_start", messageId: msg.id });
          }
          break;
        }
        case "message_update": {
          const ame = event.assistantMessageEvent;
          if (!ame) break;
          const msg = wrap.currentAssistant;
          if (ame.type === "text_delta" && msg) {
            msg.content += ame.delta;
            this.sink(id, { type: "text_delta", delta: ame.delta, messageId: msg.id });
          } else if (ame.type === "thinking_delta" && msg) {
            msg.thinking = (msg.thinking ?? "") + ame.delta;
            this.sink(id, { type: "thinking_delta", delta: ame.delta, messageId: msg.id });
          } else if (ame.type === "thinking_start" && msg) {
            msg.thinking = "";
            this.sink(id, { type: "thinking_start", messageId: msg.id });
          }
          break;
        }
        case "message_end": {
          const msg = wrap.currentAssistant;
          if (msg) msg.streaming = false;
          break;
        }
        case "tool_execution_start": {
          const tool: ToolCall = {
            id: event.toolCallId || uid(),
            name: String(event.toolName ?? "tool"),
            status: "running",
            summary: this.toolSummary(event.toolName, event.args),
            args: this.fmt(event.args),
            startedAt: now(),
          };
          wrap.currentToolCalls.set(tool.id, tool);
          this.attachToolToCurrent(wrap, tool);
          this.sink(id, { type: "tool_start", tool });
          break;
        }
        case "tool_execution_end": {
          const tool = wrap.currentToolCalls.get(event.toolCallId);
          if (tool) {
            tool.status = event.isError ? "error" : "success";
            tool.result = this.fmt(event.result);
            tool.endedAt = now();
            tool.durationMs = tool.endedAt - (tool.startedAt ?? tool.endedAt);
            this.sink(id, { type: "tool_end", tool });
          }
          break;
        }
        case "model_changed": {
          wrap.model = event.model ? String(event.model.id ?? event.model.model ?? "") : wrap.model;
          this.sink(id, { type: "model_changed", model: wrap.model });
          break;
        }
        case "notice": {
          this.sink(id, { type: "notice", message: String(event.message ?? "") });
          break;
        }
        case "agent_end": {
          const msg = wrap.currentAssistant;
          if (msg) msg.streaming = false;
          wrap.updatedAt = now();
          const usage = event.telemetry
            ? { input: event.telemetry.inputTokens ?? event.telemetry.input, output: event.telemetry.outputTokens ?? event.telemetry.output, cost: event.telemetry.cost }
            : undefined;
          const msgId = msg?.id;
          wrap.currentAssistant = undefined;
          this.sink(id, { type: "assistant_end", messageId: msgId, usage });
          this.sink(id, { type: "turn_end", messageId: msgId, usage });
          this.sink(id, { type: "session_update", session: this.info(wrap) });
          break;
        }
      }
    });
  }

  private attachToolToCurrent(wrap: LiveSession, tool: ToolCall): void {
    const msg = wrap.currentAssistant;
    if (!msg) return;
    const list = msg.toolCalls ?? [];
    const idx = list.findIndex((t) => t.id === tool.id);
    if (idx >= 0) list[idx] = tool;
    else list.push(tool);
    msg.toolCalls = [...list];
  }

  private toolSummary(name: string, args: any): string | undefined {
    if (!args || typeof args !== "object") return undefined;
    const a = args as Record<string, unknown>;
    const keys = Object.keys(a);
    if (keys.length === 0) return undefined;
    const first = keys[0];
    const v = a[first];
    if (typeof v === "string") return String(v).slice(0, 80);
    if (Array.isArray(v)) return `${first}: ${v.length} items`;
    return first;
  }

  private fmt(v: unknown): string | undefined {
    if (v === undefined || v === null) return undefined;
    let s: string;
    try {
      s = typeof v === "string" ? v : JSON.stringify(v, null, 1);
    } catch {
      s = String(v);
    }
    return s.length > 1400 ? s.slice(0, 1400) + "\n…" : s;
  }

  // ---------- prompting ----------

  async prompt(id: string, input: PromptInput): Promise<boolean> {
    const s = this.sessions.get(id);
    if (!s || s.disposed) return false;
    const text = input.text.trim();
    if (!text) return false;

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      timestamp: now(),
      rainbow: /(^|\s)ultrathink(\s|$|!|\.)/i.test(text),
    };
    s.messages.push(userMsg);
    s.updatedAt = now();

    if (input.thinkingLevel) {
      s.thinkingLevel = input.thinkingLevel;
      void s.sdk.setThinkingLevel(input.thinkingLevel);
    }
    if (input.mode === "plan") {
      s.planMode = true;
      s.sdk.setPlanModeState({
        enabled: true,
        planFilePath: join(tmpdir(), `omp-plan-${id}.md`),
        workflow: "parallel",
      });
      this.sink(id, { type: "notice", message: "Plan mode on — researching before building." });
    }

    this.sink(id, { type: "session_update", session: this.info(s) });
    return s.sdk.prompt(text).then(
      () => {
        if (input.mode === "plan" && s.sdk) {
          s.sdk.setPlanModeState({ enabled: false, planFilePath: join(tmpdir(), `omp-plan-${id}.md`), workflow: "parallel" });
        }
        return true;
      },
      (err: unknown) => {
        this.sink(id, { type: "error", message: err instanceof Error ? err.message : String(err) });
        return false;
      },
    );
  }

  abort(id: string): void {
    const s = this.sessions.get(id);
    if (!s) return;
    void s.sdk.abort().catch(() => {});
  }

  // ---------- model / mode ----------

  setModel(id: string, modelId: string): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    const model = this.pickModel(modelId);
    if (!model) return false;
    try {
      s.sdk.setModel(model);
      s.model = this.modelLabel(model);
      this.sink(id, { type: "model_changed", model: s.model });
      return true;
    } catch {
      return false;
    }
  }

  setThinkingLevel(id: string, level: ThinkingLevel): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    try {
      s.sdk.setThinkingLevel(level);
      s.thinkingLevel = level;
      this.sink(id, { type: "notice", message: `Thinking level set to ${level}` });
      return true;
    } catch {
      return false;
    }
  }

  setPlanMode(id: string, enabled: boolean): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    try {
      s.sdk.setPlanModeState({
        enabled,
        planFilePath: join(tmpdir(), `omp-plan-${id}.md`),
        workflow: "parallel",
      });
      s.planMode = enabled;
      this.sink(id, { type: "notice", message: enabled ? "Plan mode on." : "Plan mode off." });
      return true;
    } catch {
      return false;
    }
  }

  // ---------- branching (checkpoint copy for v1) ----------

  branchSession(id: string, entryId: string): SessionSummary | null {
    const s = this.sessions.get(id);
    if (!s || s.disposed) return null;
    const at = s.messages.findIndex((m) => m.id === entryId);
    const cut = at >= 0 ? at + 1 : s.messages.length;
    // Create a fresh SDK session that continues from a checkpoint of the history.
    void this.createSession({
      title: `Branch · ${s.title}`,
      parentId: s.id,
      cwd: s.cwd,
      model: s.model,
    }).then((summary) => {
      const child = this.sessions.get(summary.id);
      if (child) {
        child.messages = s.messages.slice(0, cut).map((m) => ({
          ...m,
          streaming: false,
          toolCalls: m.toolCalls?.map((t) => ({ ...t })),
        }));
        child.title = `Branch · ${s.title}`;
        this.sink(child.id, { type: "session_created", session: this.info(child) });
      }
    });
    return null; // summary arrives async via session_created
  }

  // ---------- panels ----------

  listMemory(id: string): MemoryEntry[] {
    return this.sessions.get(id)?.memory ?? [];
  }

  getPlan(id: string): PlanTask[] {
    return this.sessions.get(id)?.plan ?? [];
  }

  listAgents(id: string): AgentInfo[] {
    const s = this.sessions.get(id);
    if (!s) return [];
    return [...s.agents, ...[...s.currentAgents.values()]];
  }

  getDiffs(id: string): DiffFile[] {
    return this.sessions.get(id)?.diffs ?? [];
  }

  getFileTree(): FileNode[] {
    const skip = new Set(["node_modules", ".git", "dist", ".turbo", "coverage", ".next", ".cache"]);
    const walk = (dir: string, rel = ""): FileNode[] => {
      let entries: string[] = [];
      try {
        entries = readdirSync(join(PROJECT_ROOT, dir));
      } catch {
        return [];
      }
      const nodes: FileNode[] = [];
      for (const name of entries.sort()) {
        if (skip.has(name) || name.startsWith(".")) continue;
        const path = rel ? `${rel}/${name}` : name;
        const full = join(PROJECT_ROOT, dir, name);
        let isDir = false;
        try {
          isDir = statSync(full).isDirectory();
        } catch {
          continue;
        }
        if (isDir) {
          const children = walk(join(dir, name), path);
          if (children.length) nodes.push({ name, path, type: "dir", children });
        } else {
          try {
            nodes.push({ name, path, type: "file", size: statSync(full).size });
          } catch {
            /* ignore */
          }
        }
      }
      return nodes;
    };
    return walk(".");
  }

  // ---------- helpers ----------

  private summary(s: LiveSession): SessionSummary {
    return {
      id: s.id,
      title: s.title,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
      model: s.model,
      messageCount: s.messages.length,
      parentId: s.parentId,
    };
  }

  private info(s: LiveSession) {
    return {
      id: s.id,
      title: s.title,
      cwd: s.cwd,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      model: s.model,
      parentId: s.parentId,
      plan: s.plan,
      agents: [...s.agents, ...[...s.currentAgents.values()]],
    };
  }

  async dispose(): Promise<void> {
    await Promise.all([...this.sessions.values()].map((s) => s.sdk.dispose().catch(() => {})));
    this.sessions.clear();
  }
}
