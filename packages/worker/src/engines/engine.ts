import type {
  AgentEvent,
  AgentInfo,
  DiffFile,
  EngineKind,
  FileNode,
  MemoryEntry,
  PlanTask,
  SessionDetail,
  SessionSummary,
  ThinkingLevel,
} from "@omp/shared";

export interface EngineEventSink {
  (sessionId: string, event: AgentEvent): void;
}

export interface EngineSessionHandle {
  id: string;
  engine: EngineKind;
}

export interface PromptInput {
  text: string;
  mode?: "plan" | "build";
  thinkingLevel?: ThinkingLevel;
}

export interface CreateInput {
  title?: string;
  cwd?: string;
  model?: string;
  parentId?: string;
  entryId?: string;
}

/** The surface every engine (live omp SDK or demo simulator) implements. */
export interface AgentEngine {
  readonly kind: EngineKind;
  readonly name: string;
  isUsable(): boolean;
  listSessions(): SessionSummary[];
  createSession(input: CreateInput): SessionSummary | Promise<SessionSummary>;
  getSessionDetail(id: string): SessionDetail | null;
  resumeSession(id: string): SessionSummary | null;
  renameSession(id: string, title: string): boolean;
  deleteSession(id: string): boolean;
  prompt(id: string, input: PromptInput): Promise<boolean>;
  abort(id: string): void;
  branchSession(id: string, entryId: string): SessionSummary | null;
  setModel(id: string, modelId: string): boolean;
  setThinkingLevel(id: string, level: ThinkingLevel): boolean;
  setPlanMode(id: string, enabled: boolean): boolean;
  listMemory(id: string): MemoryEntry[];
  getPlan(id: string): PlanTask[];
  listAgents(id: string): AgentInfo[];
  getDiffs(id: string): DiffFile[];
  getFileTree(): FileNode[];
  getEngineHint(): string;
  setApiKey?(provider: string, key: string): boolean;
  getConfiguredProviders?(): number;
  dispose(): Promise<void>;
}

/** Routes sessions to whichever engine created them. */
export class EngineFacade implements AgentEngine {
  readonly kind: EngineKind = "demo";
  readonly name = "hybrid";

  private owners = new Map<string, EngineKind>();

  constructor(
    private live: AgentEngine | null,
    private demo: AgentEngine,
    private sink: EngineEventSink,
  ) {}

  private engines(): AgentEngine[] {
    return [this.live, this.demo].filter((e): e is AgentEngine => !!e);
  }

  private forSession(id: string): AgentEngine | null {
    const kind = this.owners.get(id);
    if (kind === "omp" && this.live) return this.live;
    if (kind === "demo") return this.demo;
    // Unknown session: prefer whichever engine knows it.
    return this.engines().find((e) => e.listSessions().some((s) => s.id === id)) ?? null;
  }

  isUsable(): boolean {
    return this.live?.isUsable() ?? false;
  }

  engineForNewSession(): AgentEngine {
    return this.isUsable() ? this.live! : this.demo;
  }

  listSessions(): SessionSummary[] {
    const all = new Map<string, SessionSummary>();
    for (const e of this.engines()) for (const s of e.listSessions()) all.set(s.id, s);
    return [...all.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async createSession(input: CreateInput): Promise<SessionSummary> {
    const engine = this.engineForNewSession();
    const summary = await engine.createSession(input);
    this.owners.set(summary.id, engine.kind);
    return summary;
  }

  getSessionDetail(id: string): SessionDetail | null {
    return this.forSession(id)?.getSessionDetail(id) ?? null;
  }

  resumeSession(id: string): SessionSummary | null {
    const engine = this.forSession(id);
    if (!engine) return null;
    return engine.resumeSession(id);
  }

  renameSession(id: string, title: string): boolean {
    return this.forSession(id)?.renameSession(id, title) ?? false;
  }

  deleteSession(id: string): boolean {
    const engine = this.forSession(id);
    this.owners.delete(id);
    return engine?.deleteSession(id) ?? false;
  }

  async prompt(id: string, input: PromptInput): Promise<boolean> {
    const engine = this.forSession(id);
    if (!engine) return false;
    return engine.prompt(id, input);
  }

  abort(id: string): void {
    this.forSession(id)?.abort(id);
  }

  branchSession(id: string, entryId: string): SessionSummary | null {
    const engine = this.forSession(id);
    if (!engine) return null;
    const summary = engine.branchSession(id, entryId);
    if (summary) {
      this.owners.set(summary.id, engine.kind);
      this.sink(summary.id, { type: "session_created", session: this.toInfo(summary) });
    }
    return summary;
  }

  setModel(id: string, modelId: string): boolean {
    return this.forSession(id)?.setModel(id, modelId) ?? false;
  }

  setThinkingLevel(id: string, level: ThinkingLevel): boolean {
    return this.forSession(id)?.setThinkingLevel(id, level) ?? false;
  }

  setPlanMode(id: string, enabled: boolean): boolean {
    return this.forSession(id)?.setPlanMode(id, enabled) ?? false;
  }

  listMemory(id: string): MemoryEntry[] {
    return this.forSession(id)?.listMemory(id) ?? [];
  }

  getPlan(id: string): PlanTask[] {
    return this.forSession(id)?.getPlan(id) ?? [];
  }

  listAgents(id: string): AgentInfo[] {
    return this.forSession(id)?.listAgents(id) ?? [];
  }

  getDiffs(id: string): DiffFile[] {
    return this.forSession(id)?.getDiffs(id) ?? [];
  }

  getFileTree(): FileNode[] {
    return this.demo.getFileTree();
  }

  getEngineHint(): string {
    if (this.isUsable()) return this.live!.getEngineHint();
    return this.demo.getEngineHint();
  }

  setApiKey(provider: string, key: string): boolean {
    if (this.live?.setApiKey?.(provider, key)) {
      return true;
    }
    return false;
  }

  getConfiguredProviders(): number {
    return this.live?.getConfiguredProviders?.() ?? 0;
  }

  async dispose(): Promise<void> {
    await Promise.all(this.engines().map((e) => e.dispose()));
  }

  private toInfo(s: SessionSummary) {
    const detail = this.getSessionDetail(s.id);
    return {
      id: s.id,
      title: s.title,
      cwd: detail?.cwd ?? "",
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      model: s.model,
      parentId: s.parentId ?? null,
      plan: detail?.plan ?? [],
      agents: detail?.agents ?? [],
    };
  }
}
