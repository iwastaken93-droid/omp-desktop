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
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { AgentEngine, CreateInput, EngineEventSink, PromptInput } from "./engine";

const PROJECT_ROOT = process.env.OMP_PROJECT_ROOT || process.cwd();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

function fmtArgs(args: unknown): string {
  try {
    const s = JSON.stringify(args, null, 1);
    return s.length > 900 ? s.slice(0, 900) + "\n…" : s;
  } catch {
    return String(args);
  }
}

function fmtResult(result: unknown): string {
  if (result === undefined || result === null) return "";
  if (typeof result === "string") return result.length > 1200 ? result.slice(0, 1200) + "\n…" : result;
  return fmtArgs(result);
}

const TOOL_NAMES: Record<string, { label: string; group: string }> = {
  read: { label: "read", group: "Files & search" },
  write: { label: "write", group: "Files & search" },
  edit: { label: "edit", group: "Files & search" },
  grep: { label: "grep", group: "Files & search" },
  glob: { label: "glob", group: "Files & search" },
  bash: { label: "bash", group: "Runtime" },
  eval: { label: "eval", group: "Runtime" },
  lsp: { label: "lsp", group: "Code intelligence" },
  debug: { label: "debug", group: "Code intelligence" },
  task: { label: "task", group: "Coordination" },
  hub: { label: "hub", group: "Coordination" },
  todo: { label: "todo", group: "Coordination" },
  web_search: { label: "web_search", group: "Desktop & web" },
  browser: { label: "browser", group: "Desktop & web" },
  github: { label: "github", group: "Desktop & web" },
  retain: { label: "retain", group: "Memory & skills" },
  recall: { label: "recall", group: "Memory & skills" },
  learn: { label: "learn", group: "Memory & skills" },
  manage_skill: { label: "manage_skill", group: "Memory & skills" },
};

const KNOWN_FILES = [
  "package.json",
  "packages/shared/src/index.ts",
  "packages/worker/src/index.ts",
  "packages/ui/src/App.tsx",
  "packages/ui/src/index.css",
  "packages/ui/vite.config.ts",
  "tsconfig.json",
  "README.md",
];

function pickRepoFile(exists = true): string {
  const existing = KNOWN_FILES.filter((f) => existsSync(join(PROJECT_ROOT, f)));
  const pool = exists ? existing : KNOWN_FILES.filter((f) => !existing.includes(f));
  const list = (exists ? existing : pool).length ? (exists ? existing : pool) : KNOWN_FILES;
  return list[Math.floor(Math.random() * list.length)] ?? "README.md";
}

function readFilePreview(path: string): string {
  const full = join(PROJECT_ROOT, path);
  if (!existsSync(full)) return `(no such file: ${path})`;
  try {
    const content = readFileSync(full, "utf8");
    const lines = content.split("\n");
    const shown = lines.slice(0, 60);
    const ellipsis = lines.length > 60 ? `\n… (${lines.length - 60} more lines)` : "";
    return `${path} · ${lines.length} lines\n${shown.join("\n")}${ellipsis}`;
  } catch {
    return `(could not read ${path})`;
  }
}

function makeDiff(path: string, before: string[], after: string[]): DiffFile {
  const lines: string[] = [];
  const max = Math.max(before.length, after.length);
  let idx = 0;
  while (idx < max) {
    const b = before[idx];
    const a = after[idx];
    if (b === a) {
      lines.push(` ${b}`);
    } else if (b !== undefined && a !== undefined) {
      lines.push(`-${b}`, `+${a}`);
    } else if (b !== undefined) {
      lines.push(`-${b}`);
    } else {
      lines.push(`+${a}`);
    }
    idx++;
  }
  return {
    path,
    status: "modified" as const,
    hunks: [{ lines }],
  };
}

function planFromPrompt(text: string): PlanTask[] {
  const topic = text.replace(/^plan\s*:?\s*/i, "").trim() || "the requested change";
  const short = topic.length > 60 ? topic.slice(0, 60) + "…" : topic;
  return [
    { id: uid(), text: `Scope ${short} against the codebase`, status: "in_progress", phase: "Investigate" },
    { id: uid(), text: `Design the change and list touch points`, status: "pending", phase: "Design" },
    { id: uid(), text: `Implement core changes with hashline edits`, status: "pending", phase: "Build" },
    { id: uid(), text: `Run typecheck and tests`, status: "pending", phase: "Verify" },
    { id: uid(), text: `Summarize the diff for review`, status: "pending", phase: "Report" },
  ];
}

interface DemoSession {
  id: string;
  title: string;
  cwd: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  parentId: string | null;
  messages: ChatMessage[];
  plan: PlanTask[];
  agents: AgentInfo[];
  memory: MemoryEntry[];
  diffs: DiffFile[];
  thinkingLevel: ThinkingLevel;
  planMode: boolean;
  aborted: boolean;
  activeTimers: ReturnType<typeof setTimeout>[];
}

export class DemoEngine implements AgentEngine {
  readonly kind = "demo" as const;
  readonly name = "OMP Demo Engine";

  private sessions = new Map<string, DemoSession>();
  private turnSeq = 0;

  constructor(private sink: EngineEventSink) {}

  getEngineHint(): string {
    return "demo mode — no provider keys detected, so a simulated agent is running. Add an API key (e.g. ANTHROPIC_API_KEY) and restart the worker to drive the real omp engine.";
  }

  isUsable(): boolean {
    return true;
  }

  // ---------- session management ----------

  listSessions(): SessionSummary[] {
    return [...this.sessions.values()]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((s) => this.summary(s));
  }

  getSessionDetail(id: string): SessionDetail | null {
    const s = this.sessions.get(id);
    if (!s) return null;
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
      agents: s.agents,
      memory: s.memory,
      diffs: s.diffs,
    };
  }

  resumeSession(id: string): SessionSummary | null {
    const s = this.sessions.get(id);
    return s ? this.summary(s) : null;
  }

  createSession(input: CreateInput): SessionSummary {
    const id = uid();
    const session: DemoSession = {
      id,
      title: input.title || "New session",
      cwd: input.cwd || PROJECT_ROOT,
      createdAt: now(),
      updatedAt: now(),
      model: input.model || "anthropic/claude-sonnet-4-5",
      parentId: input.parentId ?? null,
      messages: [],
      plan: [],
      agents: [],
      memory: [],
      diffs: [],
      thinkingLevel: "medium",
      planMode: false,
      aborted: false,
      activeTimers: [],
    };
    this.sessions.set(id, session);
    // Friendly intro message so the studio never looks empty.
    const intro: ChatMessage = {
      id: uid(),
      role: "assistant",
      content:
        this.intro(session.model),
      timestamp: now(),
      model: session.model,
    };
    session.messages.push(intro);
    this.emit(id, { type: "session_created", session: this.info(session) });
    return this.summary(session);
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
    s.activeTimers.forEach((t) => clearTimeout(t));
    return this.sessions.delete(id);
  }

  // ---------- model / mode ----------

  setModel(id: string, modelId: string): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    s.model = modelId;
    this.emit(id, { type: "model_changed", model: modelId });
    this.emit(id, { type: "notice", message: `Model switched to ${modelId}` });
    return true;
  }

  setThinkingLevel(id: string, level: ThinkingLevel): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    s.thinkingLevel = level;
    this.emit(id, { type: "notice", message: `Thinking level set to ${level}` });
    return true;
  }

  setPlanMode(id: string, enabled: boolean): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    s.planMode = enabled;
    if (enabled && s.plan.length === 0) {
      s.plan = planFromPrompt("the requested change");
      this.emit(id, { type: "plan_update", plan: s.plan });
    }
    this.emit(id, { type: "notice", message: enabled ? "Plan mode on — I'll research first, then propose a plan for approval." : "Plan mode off — I'll build directly." });
    return true;
  }

  // ---------- branching ----------

  branchSession(id: string, entryId: string): SessionSummary | null {
    const s = this.sessions.get(id);
    if (!s) return null;
    const at = s.messages.findIndex((m) => m.id === entryId);
    const cut = at >= 0 ? at + 1 : s.messages.length;
    const child: DemoSession = {
      ...s,
      id: uid(),
      title: `Branch · ${s.title}`,
      createdAt: now(),
      updatedAt: now(),
      parentId: s.id,
      messages: s.messages.slice(0, cut).map((m) => ({ ...m, toolCalls: m.toolCalls?.map((t) => ({ ...t })) })),
      plan: [...s.plan],
      agents: [],
      diffs: [],
      aborted: false,
      activeTimers: [],
    };
    this.sessions.set(child.id, child);
    return this.summary(child);
  }

  // ---------- memory / plan / agents / diffs ----------

  listMemory(id: string): MemoryEntry[] {
    return this.sessions.get(id)?.memory ?? [];
  }

  getPlan(id: string): PlanTask[] {
    return this.sessions.get(id)?.plan ?? [];
  }

  listAgents(id: string): AgentInfo[] {
    return this.sessions.get(id)?.agents ?? [];
  }

  getDiffs(id: string): DiffFile[] {
    return this.sessions.get(id)?.diffs ?? [];
  }

  // ---------- filesystem ----------

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

  // ---------- prompting (the simulation) ----------

  async prompt(id: string, input: PromptInput): Promise<boolean> {
    const s = this.sessions.get(id);
    if (!s) return false;
    const text = input.text.trim();
    if (!text) return false;

    s.aborted = false;
    const seq = ++this.turnSeq;

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      timestamp: now(),
      rainbow: /(^|\s)ultrathink(\s|$|!|\.)/i.test(text),
    };
    s.messages.push(userMsg);
    s.updatedAt = now();

    const assistantId = uid();
    const assistant: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: now(),
      model: s.model,
      streaming: true,
      toolCalls: [],
    };
    s.messages.push(assistant);
    this.emit(id, { type: "session_update", session: this.info(s) });
    this.emit(id, { type: "turn_start", messageId: assistantId });
    this.emit(id, { type: "assistant_start", messageId: assistantId });

    const isUltrathink = userMsg.rainbow;
    const mode = input.mode || (s.planMode ? "plan" : "build");

    // Plan mode: build and iterate over a plan.
    if (mode === "plan") {
      s.plan = planFromPrompt(text);
      this.emit(id, { type: "plan_update", plan: s.plan });
      await this.tick(s, id, 500, seq);
      for (const task of s.plan) {
        if (s.aborted || seq !== this.turnSeq) return true;
        task.status = "in_progress";
        this.emit(id, { type: "plan_update", plan: [...s.plan] });
        this.emit(id, { type: "agent_update", agent: { id: uid(), name: `plan:${task.phase.toLowerCase()}`, status: "running", task: task.text, model: s.model, startedAt: now() } });
        await this.tick(s, id, 700, seq);
        task.status = "done";
        this.emit(id, { type: "plan_update", plan: [...s.plan] });
      }
    }

    // Thinking block (esp. for ultrathink).
    if (isUltrathink || s.thinkingLevel === "high" || s.thinkingLevel === "ultra") {
      this.emit(id, { type: "thinking_start", messageId: assistantId });
      const thought = isUltrathink
        ? "Thinking at maximum effort. Breaking the request into sub-problems, considering failure modes, and planning the minimal safe change…"
        : "Thinking through the approach and the files that will be affected…";
      const thoughtBuf: string[] = [];
      for (const ch of thought) {
        if (s.aborted || seq !== this.turnSeq) return true;
        thoughtBuf.push(ch);
        this.emit(id, { type: "thinking_delta", delta: ch, messageId: assistantId });
        if (ch === "…") await this.tick(s, id, 120, seq);
      }
      assistant.thinking = thoughtBuf.join("");
      this.emit(id, { type: "thinking_end", messageId: assistantId });
      await this.tick(s, id, 200, seq);
    }

    // Tool cards driven by what the user asked for.
    const tools = this.planTools(text, mode, s);
    const toolCalls: ToolCall[] = [];
    for (const t of tools) {
      if (s.aborted || seq !== this.turnSeq) return true;
      const call: ToolCall = {
        id: uid(),
        name: t.name,
        status: "running",
        summary: t.summary,
        args: t.args ? fmtArgs(t.args) : undefined,
        startedAt: now(),
      };
      toolCalls.push(call);
      assistant.toolCalls = [...toolCalls];
      this.emit(id, { type: "tool_start", tool: call });
      await this.tick(s, id, t.delay ?? 450, seq);
      call.status = t.error ? "error" : "success";
      call.result = t.result ? fmtResult(t.result) : undefined;
      call.endedAt = now();
      call.durationMs = call.endedAt - (call.startedAt ?? call.endedAt);
      assistant.toolCalls = [...toolCalls];
      this.emit(id, { type: "tool_end", tool: call });
      if (t.diff) {
        s.diffs.unshift(t.diff);
        this.emit(id, { type: "diff_update", diff: t.diff });
      }
      if (t.memory) {
        s.memory.unshift(t.memory);
        this.emit(id, { type: "memory_update", memory: t.memory });
      }
      if (t.agents) {
        s.agents.push(...t.agents);
        for (const a of t.agents) this.emit(id, { type: "agent_update", agent: a });
      }
      await this.tick(s, id, 200, seq);
    }

    // The response text.
    const response = this.respond(text, mode, tools, s);
    const buf: string[] = [];
    for (const chunk of response) {
      if (s.aborted || seq !== this.turnSeq) return true;
      buf.push(chunk);
      this.emit(id, { type: "text_delta", delta: chunk, messageId: assistantId });
      await this.tick(s, id, chunk.length > 60 ? 14 : 22, seq);
    }
    assistant.content = buf.join("");
    assistant.streaming = false;
    s.updatedAt = now();

    const usage = {
      input: 2_400 + Math.floor(Math.random() * 8_000),
      output: Math.max(200, Math.round(buf.join("").length / 4)),
      cost: Number((Math.random() * 0.08).toFixed(4)),
    };

    this.emit(id, { type: "assistant_end", messageId: assistantId, usage });
    this.emit(id, { type: "turn_end", messageId: assistantId, usage });
    this.emit(id, { type: "session_update", session: this.info(s) });
    return true;
  }

  abort(id: string): void {
    const s = this.sessions.get(id);
    if (!s) return;
    s.aborted = true;
    this.turnSeq++;
    s.activeTimers.forEach((t) => clearTimeout(t));
    s.activeTimers = [];
    const last = s.messages[s.messages.length - 1];
    if (last?.streaming) {
      last.streaming = false;
      this.emit(id, { type: "assistant_end", messageId: last.id });
      this.emit(id, { type: "notice", message: "Turn aborted." });
    }
  }

  async dispose(): Promise<void> {
    for (const s of this.sessions.values()) s.activeTimers.forEach((t) => clearTimeout(t));
  }

  // ---------- internals ----------

  private emit(id: string, event: AgentEvent) {
    this.sink(id, event);
  }

  private tick(s: DemoSession, id: string, ms: number, seq: number): Promise<void> {
    if (s.aborted || seq !== this.turnSeq) return Promise.resolve();
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve(), ms);
      s.activeTimers.push(t);
    });
  }

  private summary(s: DemoSession): SessionSummary {
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

  private info(s: DemoSession) {
    return {
      id: s.id,
      title: s.title,
      cwd: s.cwd,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      model: s.model,
      parentId: s.parentId,
      plan: s.plan,
      agents: s.agents,
    };
  }

  private intro(model: string): string {
    return [
      "Hey — I'm your **OMP Studio** agent, running on the Oh My Pi engine.",
      "",
      "I can read this repo, search it, edit files with hash-anchored patches, run tools, spin up subagents, and much more.",
      `Currently on **${model}** (demo profile — connect a provider key in Settings to drive the real engine).`,
      "",
      "Try something like:",
      "• *“What does this project do?”*",
      "• *“Plan adding a settings page”* (Plan mode)",
      "• *“grep for TODO and summarize the findings”*",
      "• *“spin up subagents to map the UI and worker packages”*",
    ].join("\n");
  }

  private planTools(text: string, mode: string, s: DemoSession): DemoTool[] {
    const tools: DemoTool[] = [];
    const lower = text.toLowerCase();

    // Read something relevant.
    const file = pickRepoFile(true);
    tools.push({
      name: "read",
      summary: file,
      args: { path: file },
      result: readFilePreview(file),
      delay: 420,
    });

    if (/grep|search|find|todo|where/.test(lower)) {
      const query = text.match(/"([^"]+)"/)?.[1] ?? (lower.includes("todo") || lower.includes("fixme") ? "TODO|FIXME" : (text.match(/grep\s+(.+)/i)?.[1] ?? "TODO|FIXME"));
      tools.push({
        name: "grep",
        summary: `"${query}"`,
        args: { pattern: query, include: "*.ts" },
        result: `${query}\n──────────────────────────────\npackages/worker/src/index.ts\n  24:  // TODO: wire retry policy\npackages/ui/src/App.tsx\n  12:  // FIXME: handle reconnection\npackages/shared/src/index.ts\n   3:  // TODO: version the protocol\n\n3 files · 5 matches`,
        delay: 350,
      });
    }

    if (/edit|change|add|update|fix|refactor|write|implement|improve/.test(lower)) {
      const target = /lsp|debug/.test(lower) ? "packages/worker/src/index.ts" : file;
      const before = readFilePreview(target).split("\n").slice(0, 14);
      const after = [...before];
      if (after.length > 6) {
        after.splice(6, 1, "+  // @omp: hash-anchored edit applied", "+  //   - content-hash anchors prevent stale patches");
      }
      const diff = makeDiff(target, before.slice(0, 10), after.slice(0, 10));
      tools.push({
        name: "edit",
        summary: `${target} · ${after.length - before.length} lines changed`,
        args: { path: target, anchors: ["// first", "// second"], replacements: 2 },
        result: "Applied 2 replacements in " + target,
        diff,
        delay: 650,
      });
    }

    if (/rename|reference|definition|lsp|refactor|symbol/.test(lower)) {
      tools.push({
        name: "lsp",
        summary: "references · formatBytes",
        args: { op: "references", symbol: "formatBytes" },
        result: "5 hits across 3 files\n- src/format.ts: 2\n- src/report.ts: 2\n- src/cli.ts: 1",
        delay: 500,
      });
    }

    if (/debug|segfault|breakpoint|step|stack/.test(lower)) {
      tools.push({
        name: "debug",
        summary: "attach · debugpy",
        args: { op: "attach", adapter: "debugpy", process: "worker" },
        result: "Attached. Stopped at main.py:42 · locals: { retries: 3, backoff: 0.8 }",
        delay: 550,
      });
    }

    if (/subagent|parallel|agents|delegate|task|fan.?out|orchestrate/.test(lower)) {
      const agentA: AgentInfo = { id: uid(), name: "Explorer", status: "running", task: "Map packages/ui structure", model: s.model, startedAt: now() };
      const agentB: AgentInfo = { id: uid(), name: "Analyst", status: "running", task: "Trace worker RPC surface", model: s.model, startedAt: now() };
      tools.push({
        name: "task",
        summary: "fan-out · 2 subagents",
        args: { tasks: ["Map packages/ui structure", "Trace worker RPC surface"], isolate: true },
        result: "Explorer → 14 files mapped\nAnalyst → 12 RPC methods traced",
        agents: [agentA, agentB],
        delay: 900,
      });
    }

    if (/web|search|research|look up|docs|news|api key/.test(lower)) {
      tools.push({
        name: "web_search",
        summary: `"${text.split(" ").slice(0, 6).join(" ")}"`,
        args: { query: text, provider: "auto" },
        result: "3 ranked sources\n1. omp.sh/docs — SDK & providers reference\n2. github.com/can1357/oh-my-pi — README\n3. npmjs.com/@oh-my-pi/pi-coding-agent",
        delay: 600,
      });
    }

    if (/run|execute|command|terminal|test|install|build/.test(lower)) {
      tools.push({
        name: "bash",
        summary: "bun run typecheck",
        args: { command: "bun run typecheck", timeout: 60_000 },
        result: "$ bun run typecheck\n✓ 0 errors found",
        delay: 700,
      });
    }

    if (/remember|memorize|note/.test(lower)) {
      const fact = text.replace(/remember|memorize|note/gi, "").replace(/^[:,\s]+/, "").slice(0, 120) || "the user prefers light mode";
      tools.push({
        name: "retain",
        summary: fact.slice(0, 50),
        args: { fact },
        memory: { id: uid(), kind: "fact", content: fact, tags: ["user"], createdAt: now() },
        delay: 300,
      });
    }

    if (/recall|memory|skills?/.test(lower)) {
      tools.push({
        name: "recall",
        summary: "memory bank · 2 entries",
        args: { query: lower.includes("recall") ? text : "*" },
        result: "2 memories found\n1. fact — “the user prefers light mode”\n2. lesson — “keep edits minimal and type-safe”",
        delay: 350,
      });
    }

    if (mode === "plan" && tools.length === 1) {
      tools.push({
        name: "todo",
        summary: "track 5 plan tasks",
        args: { tasks: planFromPrompt(text).map((t) => t.text) },
        result: "5 tasks tracked across 3 phases",
        delay: 300,
      });
    }

    return tools;
  }

  private respond(text: string, mode: string, tools: DemoTool[], s: DemoSession): string[] {
    const lower = text.toLowerCase();
    const topic = text.trim().replace(/[.?!]+$/, "");
    const head: string[] = [];

    if (mode === "plan") {
      head.push(
        "Here's the plan I'd follow:",
        "",
        "1. **Investigate** — map the code paths the change touches (done above).",
        "2. **Design** — pick the smallest surface that satisfies the goal.",
        "3. **Build** — apply hash-anchored edits, one concern per patch.",
        "4. **Verify** — run `bun run typecheck` and the relevant tests.",
        "5. **Report** — hand back a summary and the resulting diff for review.",
        "",
      );
    }

    let body: string;
    if (/grep|search|find/.test(lower) && /todo|fixme|pattern|match/.test(lower)) {
      body = [
        "Found **5 TODO/FIXME markers** across 3 files. The notable one is a retry policy that's stubbed in `packages/worker/src/index.ts` — worth wiring up with backoff before shipping.",
        "",
        "Want me to plan that fix in Plan mode, or go ahead and implement it?",
      ].join("\n");
    } else if (/what.*(this|project|repo|codebase)|overview|explain.*project/.test(lower)) {
      body = [
        "This is **OMP Studio** — a web-first desktop app for the Oh My Pi coding agent. The repo is a Bun monorepo:",
        "",
        "- `packages/worker` — a Bun worker that embeds the **@oh-my-pi/pi-coding-agent** SDK, exposing sessions, streaming events, the model catalog, and tool executions over WebSocket.",
        "- `packages/ui` — a React + Vite studio: chat with streaming, tool cards, sessions & branching, plan mode, a subagent hub, diffs, and provider settings.",
        "- `packages/shared` — the JSON-RPC protocol types both sides speak.",
        "",
        "It mirrors the omp feature set you'd get in the terminal — plan mode, subagents, LSP, memory, 60+ providers — in a clean, light, Codex-style interface.",
      ].join("\n");
    } else if (/edit|fix|implement|change|refactor|add/.test(lower)) {
      body = [
        `Done — I applied the change to the workspace with a hash-anchored edit, so the patch only lands where the content-hash anchors still match. The diff is in the **Diffs** panel (and inline on the tool card).`,
        "",
        `For \`${topic}\`, the important next steps are verifying with \`bun run typecheck\` and confirming the surrounding tests still pass. I can run that now if you'd like.`,
      ].join("\n");
    } else if (/subagent|parallel|task|orchestrate/.test(lower)) {
      body = [
        "I fanned the work out across **2 isolated subagents** — each got its own tool surface and workspace, then yielded schema-validated results back to me. No merge conflicts, no orphaned edits.",
        "",
        "- **Explorer** → mapped 14 files in `packages/ui`",
        "- **Analyst** → traced the 12 RPC methods the worker exposes",
        "",
        "The Agent Hub panel shows both transcripts and usage. Want me to deepen one of them, or fold the findings into a plan?",
      ].join("\n");
    } else if (/remember|recall|memory/.test(lower)) {
      body = [
        "Noted — I've updated the project-scoped memory bank. Facts persist between sessions and get recalled automatically on the first turn of the next one, so I'll remember this context next time.",
      ].join("\n");
    } else if (/lsp|rename|reference|symbol/.test(lower)) {
      body = [
        "I used the **LSP** tool (not string matching) for this — references resolve through the language server, so renames propagate through re-exports and aliased imports, not just exact matches.",
      ].join("\n");
    } else if (/debug/.test(lower)) {
      body = [
        "I attached a **DAP debugger** and stepped to the failing frame. Locals: `retries: 3`, `backoff: 0.8`. The retry loop is exiting early on the first transient error — a simple `continue` on 429s fixes it.",
      ].join("\n");
    } else if (/hello|hi|hey/.test(lower)) {
      body = [
        "Hey! I'm ready. I can read and search this repo, plan changes, fan out subagents, apply edits with hash-anchored patches, and drive LSP/DAP when the workspace supports it.",
        "",
        "What are we building?",
      ].join("\n");
    } else {
      body = [
        `Here's what I did for \`${topic}\`:`,
        "",
        "- Scanned the workspace for the relevant files and read the most likely touch point.",
        "- Ran the appropriate tools (see the cards above) and synthesized the results.",
        "- Kept the change minimal and reversible — previews land as diffs you can review in the Diffs panel.",
        "",
        "Tell me if you'd like me to go deeper on any part, switch the active model, or turn on Plan mode to sketch the approach first.",
      ].join("\n");
    }

    const outro = s.thinkingLevel === "ultra" || /ultrathink/i.test(text)
      ? ["", "*(Maximum thinking effort applied — this one got the full reasoning pass.)*"]
      : [];
    const paragraphs = (head.length ? head : []).concat(body.split("\n"), outro);
    return paragraphs.join("\n").split(/(?<=\n\n)/);
  }
}

interface DemoTool {
  name: string;
  summary: string;
  args?: unknown;
  result?: unknown;
  error?: boolean;
  delay?: number;
  diff?: DiffFile;
  memory?: MemoryEntry;
  agents?: AgentInfo[];
}
