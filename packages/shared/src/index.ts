// Shared protocol types between the OMP Studio UI and the local agent worker.

export type Role = "user" | "assistant" | "system";

export type ToolStatus = "running" | "success" | "error" | "pending";

export interface ToolCall {
  id: string;
  name: string;
  status: ToolStatus;
  summary?: string;
  args?: string;
  result?: string;
  startedAt?: number;
  endedAt?: number;
  durationMs?: number;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  model?: string;
  toolCalls?: ToolCall[];
  streaming?: boolean;
  thinking?: string;
  rainbow?: boolean;
}

export interface SessionInfo {
  id: string;
  title: string;
  cwd: string;
  createdAt: number;
  updatedAt: number;
  model?: string;
  parentId?: string | null;
  leafId?: string;
  branchSummaries?: { entryId: string; summary: string }[];
  plan?: PlanTask[];
  agents?: AgentInfo[];
}

export interface PlanTask {
  id: string;
  text: string;
  status: "pending" | "in_progress" | "done";
  phase: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  status: "running" | "parked" | "done" | "error";
  task: string;
  model?: string;
  usage?: { input: number; output: number; cost: number };
  startedAt?: number;
}

export interface MemoryEntry {
  id: string;
  kind: "fact" | "lesson" | "summary";
  content: string;
  tags?: string[];
  createdAt: number;
}

export interface DiffFile {
  path: string;
  status: "modified" | "added" | "deleted";
  hunks: { lines: string[] }[];
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
  size?: number;
}

export type ThinkingLevel = "low" | "medium" | "high" | "ultra";

export type EngineKind = "omp" | "demo";

export type WorkerStatus =
  | { state: "ok"; engine: EngineKind; providersConfigured: number }
  | { state: "error"; message: string };

// ---- JSON-RPC protocol (worker <-> UI over WebSocket) ----

export type RpcMethod =
  | "ping"
  | "status"
  | "listSessions"
  | "createSession"
  | "resumeSession"
  | "renameSession"
  | "deleteSession"
  | "getSessionDetail"
  | "prompt"
  | "abort"
  | "branchSession"
  | "listModels"
  | "listProviders"
  | "setApiKey"
  | "setModel"
  | "setThinkingLevel"
  | "setPlanMode"
  | "getSettings"
  | "setSettings"
  | "listMemory"
  | "getPlan"
  | "listAgents"
  | "getDiffs"
  | "getFileTree";

export interface RpcRequest {
  id: number;
  method: RpcMethod;
  params?: Record<string, unknown>;
}

export interface RpcResponse<T = unknown> {
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

export type AgentEvent =
  | { type: "text_delta"; delta: string; messageId?: string }
  | { type: "thinking_start"; messageId?: string }
  | { type: "thinking_delta"; delta: string; messageId?: string }
  | { type: "thinking_end"; messageId?: string }
  | { type: "assistant_start"; messageId?: string }
  | { type: "assistant_end"; messageId?: string; usage?: Record<string, number> }
  | { type: "tool_start"; tool: ToolCall }
  | { type: "tool_update"; tool: ToolCall }
  | { type: "tool_end"; tool: ToolCall }
  | { type: "turn_start"; messageId?: string }
  | { type: "turn_end"; messageId?: string; usage?: Record<string, number> }
  | { type: "session_update"; session: SessionInfo }
  | { type: "session_created"; session: SessionInfo }
  | { type: "agent_update"; agent: AgentInfo }
  | { type: "plan_update"; plan: PlanTask[] }
  | { type: "memory_update"; memory: MemoryEntry }
  | { type: "diff_update"; diff: DiffFile }
  | { type: "model_changed"; model?: string }
  | { type: "notice"; message: string }
  | { type: "error"; message: string };

export interface RpcNotification {
  event: "agent_event";
  sessionId: string;
  data: AgentEvent;
}

export interface CreateSessionParams {
  title?: string;
  cwd?: string;
  model?: string;
  parentId?: string;
  entryId?: string;
}

export interface PromptParams {
  sessionId: string;
  text: string;
  mode?: "plan" | "build";
  thinkingLevel?: ThinkingLevel;
}

export interface SessionSummary {
  id: string;
  title: string;
  updatedAt: number;
  createdAt: number;
  model?: string;
  messageCount: number;
  parentId?: string | null;
}

export interface SessionDetail {
  id: string;
  title: string;
  cwd: string;
  createdAt: number;
  updatedAt: number;
  model?: string;
  parentId?: string | null;
  messages: ChatMessage[];
  plan: PlanTask[];
  agents: AgentInfo[];
  memory: MemoryEntry[];
  diffs: DiffFile[];
}

export interface ProviderInfo {
  id: string;
  name: string;
  envVar: string;
  configured: boolean;
  oauth: boolean;
  category: "frontier" | "coding-plan" | "local" | "custom";
  modelCount: number;
}

export interface ModelInfo {
  id: string;
  provider: string;
  name: string;
  contextWindow?: number;
  maxTokens?: number;
  available: boolean;
  cost?: { input?: number; output?: number };
}

export interface AppSettings {
  autoTitle: boolean;
  confirmDestructiveTools: boolean;
  showToolArguments: boolean;
  streamRules: boolean;
  memoryBackend: "off" | "local" | "hindsight";
}
