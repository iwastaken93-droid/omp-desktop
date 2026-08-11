import { create } from "zustand";
import type {
  ChatMessage,
  EngineKind,
  FileNode,
  ModelInfo,
  ProviderInfo,
  ModelRoleInfo,
  ThinkingOption,
  RpcNotification,
  SessionDetail,
  SessionSummary,
  ThinkingLevel,
} from "@omp/shared";
import { rpc } from "./rpc";

export type RightPanel = "plan" | "agents" | "diffs" | "files" | "memory" | "lsp" | null;

export interface Notice {
  id: string;
  message: string;
  kind: "info" | "warn" | "error";
}

interface StudioState {
  connected: boolean;
  engine: EngineKind;
  providersConfigured: number;
  engineHint: string;
  sessions: SessionSummary[];
  activeSessionId: string | null;
  detail: SessionDetail | null;
  busy: boolean;
  planMode: boolean;
  thinkingLevel: ThinkingLevel;
  settingsOpen: boolean;
  rightPanel: RightPanel;
  fileTree: FileNode[];
  providers: ProviderInfo[];
  models: ModelInfo[];
  roles: ModelRoleInfo[];
  thinkingOptions: ThinkingOption[];
  oauthFlow: { provider: string; name: string; url: string; launchUrl?: string; instructions?: string; progress?: string } | null;
  notices: Notice[];

  init(): Promise<void>;
  createSession(): Promise<string | null>;
  selectSession(id: string): Promise<void>;
  sendPrompt(text: string, mode?: "plan" | "build"): Promise<void>;
  abort(): void;
  branchFrom(entryId: string): Promise<void>;
  renameSession(id: string, title: string): Promise<void>;
  deleteSession(id: string): Promise<void>;
  setModel(modelId: string): Promise<void>;
  setThinking(level: ThinkingLevel): Promise<void>;
  togglePlanMode(): Promise<void>;
  openSettings(): void;
  closeSettings(): void;
  setRightPanel(p: RightPanel): void;
  dismissNotice(id: string): void;
  reset(): void;
}

let noticeSeq = 0;
let initialized = false;

export const useStudio = create<StudioState>((set, get) => {
  const pushNotice = (message: string, kind: Notice["kind"] = "info") => {
    const notice: Notice = { id: `n${++noticeSeq}`, message, kind };
    set((s) => ({ notices: [...s.notices.slice(-3), notice] }));
    setTimeout(() => get().dismissNotice(notice.id), 5200);
  };

  const findMessage = (detail: SessionDetail | null, messageId?: string): ChatMessage | null => {
    if (!detail) return null;
    if (messageId) {
      const hit = detail.messages.find((m) => m.id === messageId);
      if (hit) return hit;
    }
    // Fall back to the last assistant message (streaming or not).
    for (let i = detail.messages.length - 1; i >= 0; i--) {
      const m = detail.messages[i];
      if (m.role === "assistant") return m;
    }
    return null;
  };

  const patchMessage = (messageId: string | undefined, fn: (m: ChatMessage) => void) => {
    const detail = get().detail;
    const msg = findMessage(detail, messageId);
    if (!detail || !msg) return;
    fn(msg);
    set({ detail: { ...detail, messages: detail.messages.map((m) => (m.id === msg.id ? { ...msg } : m)) } });
  };

  const handleNotification = (notif: RpcNotification) => {
    const { data } = notif;
    const isActive = notif.sessionId === get().activeSessionId;
    const detail = get().detail;

    // Message-scoped events only apply to the visible session. Guard early so a
    // background session's stream never bleeds into the active transcript.
    if (!isActive) {
      switch (data.type) {
        case "assistant_start":
        case "thinking_start":
        case "thinking_delta":
        case "thinking_end":
        case "text_delta":
        case "assistant_end":
        case "tool_start":
        case "tool_end":
        case "turn_start":
        case "plan_update":
        case "agent_update":
        case "memory_update":
        case "diff_update":
        case "model_changed":
          return;
        default:
          break;
      }
    }

    switch (data.type) {
      case "auth_required":
        set({ oauthFlow: { provider: data.provider, name: data.name, url: data.url, launchUrl: data.launchUrl, instructions: data.instructions } });
        pushNotice(`${data.name} sign-in is ready. Open the authorization page to continue.`, "info");
        break;
      case "auth_progress":
        set((st) => ({ oauthFlow: st.oauthFlow?.provider === data.provider ? { ...st.oauthFlow, progress: data.message } : st.oauthFlow }));
        break;
      case "auth_complete":
        set({ oauthFlow: null });
        pushNotice(data.message, data.success ? "info" : "error");
        if (data.success) void loadCatalog();
        break;
      case "session_created": {
        const s: SessionSummary = {
          id: data.session.id,
          title: data.session.title,
          createdAt: data.session.createdAt,
          updatedAt: data.session.updatedAt,
          model: data.session.model,
          messageCount: 1,
          parentId: data.session.parentId ?? null,
        };
        set((st) => ({ sessions: [s, ...st.sessions.filter((x) => x.id !== s.id)] }));
        void get().selectSession(s.id);
        break;
      }
      case "session_update": {
        set((st) => ({
          sessions: st.sessions.map((x) =>
            x.id === notif.sessionId
              ? { ...x, title: data.session.title, model: data.session.model ?? x.model, updatedAt: data.session.updatedAt }
              : x,
          ),
        }));
        break;
      }
      case "turn_start":
        set({ busy: true });
        break;
      case "assistant_start":
        if (isActive) {
          const msg: ChatMessage = {
            id: data.messageId ?? `m${Date.now()}`,
            role: "assistant",
            content: "",
            timestamp: Date.now(),
            model: get().detail?.model,
            streaming: true,
            toolCalls: [],
          };
          set((st) => ({ detail: st.detail ? { ...st.detail, messages: [...st.detail.messages, msg] } : st.detail }));
        }
        set({ busy: true });
        break;
      case "thinking_start":
        patchMessage(data.messageId, (m) => {
          m.thinking = "";
        });
        break;
      case "thinking_delta":
        patchMessage(data.messageId, (m) => {
          m.thinking = (m.thinking ?? "") + data.delta;
        });
        break;
      case "thinking_end":
        break;
      case "text_delta":
        patchMessage(data.messageId, (m) => {
          m.content += data.delta;
        });
        break;
      case "assistant_end":
        if (data.messageId) {
          patchMessage(data.messageId, (m) => {
            m.streaming = false;
          });
        }
        break;
      case "tool_start":
        if (isActive && detail) {
          const msg = findMessage(detail, undefined);
          if (msg) {
            const list = [...(msg.toolCalls ?? [])];
            const idx = list.findIndex((t) => t.id === data.tool.id);
            if (idx >= 0) list[idx] = data.tool;
            else list.push(data.tool);
            patchMessage(msg.id, (m) => {
              m.toolCalls = list;
            });
          }
        }
        break;
      case "tool_end":
        if (isActive && detail) {
          const msg = findMessage(detail, undefined);
          if (msg) {
            const list = (msg.toolCalls ?? []).map((t) => (t.id === data.tool.id ? data.tool : t));
            patchMessage(msg.id, (m) => {
              m.toolCalls = list;
            });
          }
        }
        break;
      case "turn_end": {
        set({ busy: false });
        if (isActive && detail) {
          set((st) => ({
            sessions: st.sessions.map((x) => (x.id === notif.sessionId ? { ...x, updatedAt: Date.now() } : x)),
          }));
        }
        break;
      }
      case "plan_update":
        if (isActive && detail) set({ detail: { ...detail, plan: data.plan } });
        break;
      case "agent_update":
        if (isActive && detail) {
          const exists = detail.agents.some((a) => a.id === data.agent.id);
          const agents = exists ? detail.agents.map((a) => (a.id === data.agent.id ? data.agent : a)) : [...detail.agents, data.agent];
          set({ detail: { ...detail, agents } });
        }
        break;
      case "memory_update":
        if (isActive && detail) set({ detail: { ...detail, memory: [data.memory, ...detail.memory] } });
        break;
      case "diff_update":
        if (isActive && detail) set({ detail: { ...detail, diffs: [data.diff, ...detail.diffs] } });
        break;
      case "model_changed":
        if (isActive && detail) set({ detail: { ...detail, model: data.model ?? detail.model } });
        break;
      case "notice":
        pushNotice(data.message, "info");
        break;
      case "error":
        set({ busy: false });
        pushNotice(data.message, "error");
        break;
    }
  };

  const loadCatalog = async () => {
    try {
      const res = await fetch("/api/catalog");
      if (res.ok) {
        const cat = await res.json();
        set({ providers: cat.providers ?? [], models: cat.models ?? [], roles: cat.roles ?? [], thinkingOptions: cat.thinking ?? [] });
      }
    } catch {
      /* preview may start before worker; retried on reconnect */
    }
  };

  const refreshSessions = async () => {
    try {
      const sessions = await rpc.call<SessionSummary[]>("listSessions");
      set({ sessions: sessions.sort((a, b) => b.updatedAt - a.updatedAt) });
    } catch {
      /* not connected yet */
    }
  };

  return {
    connected: false,
    engine: "omp",
    providersConfigured: 0,
    engineHint: "",
    sessions: [],
    activeSessionId: null,
    detail: null,
    busy: false,
    planMode: false,
    thinkingLevel: "medium",
    settingsOpen: false,
    rightPanel: null,
    fileTree: [],
    providers: [],
    models: [],
    roles: [],
    thinkingOptions: [],
    oauthFlow: null,
    notices: [],

    async init() {
      if (initialized) return;
      initialized = true;
      rpc.onNotification(handleNotification);
      rpc.onStatus = (connected) => set({ connected });
      rpc.connect();

      const boot = async () => {
        try {
          const status = await rpc.call<{ engine: EngineKind; providersConfigured: number; hint?: string }>("status");
          set({ engine: status.engine, providersConfigured: status.providersConfigured ?? 0, engineHint: status.hint ?? "" });
        } catch {
          /* worker not up yet */
        }
        await Promise.all([refreshSessions(), loadCatalog()]);
        try {
          const tree = await rpc.call<FileNode[]>("getFileTree");
          set({ fileTree: tree });
        } catch {
          /* ignore */
        }
        // Sessions are real omp sessions only. With no configured provider the
        // studio stays empty and points the user to Settings instead of creating
        // a simulator session.
        const { sessions, activeSessionId, models } = get();
        if (sessions.length && !activeSessionId) {
          await get().selectSession(sessions[0].id);
        } else if (!sessions.length && models.length > 0) {
          await get().createSession();
        }
      };
      void boot();
    },

    async createSession() {
      try {
        const created = await rpc.call<SessionSummary>("createSession", {});
        await refreshSessions();
        await get().selectSession(created.id);
        return created.id;
      } catch (e) {
        pushNotice(e instanceof Error ? e.message : String(e), "error");
        return null;
      }
    },

    async selectSession(id) {
      set({ activeSessionId: id, rightPanel: null });
      try {
        const detail = await rpc.call<SessionDetail>("getSessionDetail", { sessionId: id });
        set({ detail });
      } catch (e) {
        pushNotice(e instanceof Error ? e.message : String(e), "error");
      }
    },

    async sendPrompt(text, mode) {
      const id = get().activeSessionId;
      if (!id || !text.trim()) return;
      const m = mode ?? (get().planMode ? "plan" : "build");
      set({ busy: true });
      const rainbow = /(^|\s)ultrathink(\s|$|!|\.)/i.test(text);
      if (get().detail) {
        const userMsg: ChatMessage = {
          id: `u${Date.now()}`,
          role: "user",
          content: text,
          timestamp: Date.now(),
          rainbow,
        };
        set((st) => ({ detail: st.detail ? { ...st.detail, messages: [...st.detail.messages, userMsg] } : st.detail }));
      }
      try {
        const res = await rpc.call<{ accepted: boolean }>("prompt", { sessionId: id, text, mode: m, thinkingLevel: get().thinkingLevel });
        if (!res.accepted) set({ busy: false });
      } catch (e) {
        set({ busy: false });
        pushNotice(e instanceof Error ? e.message : String(e), "error");
      }
    },

    abort() {
      const id = get().activeSessionId;
      if (!id) return;
      void rpc.call("abort", { sessionId: id }).catch(() => {});
    },

    async branchFrom(entryId) {
      const id = get().activeSessionId;
      if (!id) return;
      try {
        await rpc.call("branchSession", { sessionId: id, entryId });
      } catch (e) {
        pushNotice(e instanceof Error ? e.message : String(e), "error");
      }
    },

    async renameSession(id, title) {
      try {
        await rpc.call("renameSession", { sessionId: id, title });
        set((st) => ({ sessions: st.sessions.map((x) => (x.id === id ? { ...x, title } : x)) }));
      } catch {
        /* ignore */
      }
    },

    async deleteSession(id) {
      try {
        await rpc.call("deleteSession", { sessionId: id });
        const remaining = get().sessions.filter((x) => x.id !== id);
        set({ sessions: remaining });
        if (get().activeSessionId === id) {
          if (remaining.length) await get().selectSession(remaining[0].id);
          else await get().createSession();
        }
      } catch {
        /* ignore */
      }
    },

    async setModel(modelId) {
      const id = get().activeSessionId;
      if (!id) return;
      try {
        const ok = await rpc.call<boolean>("setModel", { sessionId: id, modelId });
        if (ok && get().detail) set({ detail: { ...get().detail!, model: modelId } });
      } catch (e) {
        pushNotice(e instanceof Error ? e.message : String(e), "error");
      }
    },

    async setThinking(level) {
      set({ thinkingLevel: level });
      const id = get().activeSessionId;
      if (!id) return;
      try {
        await rpc.call("setThinkingLevel", { sessionId: id, level });
      } catch {
        /* ignore */
      }
    },

    async togglePlanMode() {
      const next = !get().planMode;
      set({ planMode: next });
      const id = get().activeSessionId;
      if (!id) return;
      try {
        await rpc.call("setPlanMode", { sessionId: id, enabled: next });
      } catch {
        /* ignore */
      }
    },

    openSettings: () => set({ settingsOpen: true }),
    closeSettings: () => set({ settingsOpen: false }),
    setRightPanel: (p) => set({ rightPanel: p }),
    dismissNotice: (id) => set((st) => ({ notices: st.notices.filter((n) => n.id !== id) })),
    reset: () => set({ activeSessionId: null, detail: null, busy: false, notices: [] }),
  };
});
