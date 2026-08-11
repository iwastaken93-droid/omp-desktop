import type { RpcRequest, RpcResponse } from "@omp/shared";
import type { EngineFacade } from "./engines/engine";
import type { Catalog } from "./catalog";

export class RpcServer {
  constructor(
    private engine: EngineFacade,
    private catalog: Catalog,
  ) {}

  async handle(req: RpcRequest): Promise<RpcResponse> {
    const { id, method, params = {} } = req;
    try {
      switch (method) {
        case "ping":
          return ok(id, { pong: true, ts: Date.now() });

        case "status":
          return ok(id, {
            state: "ok",
            engine: this.engine.isUsable() ? "omp" : "demo",
            providersConfigured: this.engine.getConfiguredProviders(),
            hint: this.engine.getEngineHint(),
            catalogLoaded: !this.catalog.failedToLoad,
          });

        case "listSessions":
          return ok(id, this.engine.listSessions());

        case "createSession":
          return ok(id, await this.engine.createSession({
            title: str(params.title),
            cwd: str(params.cwd),
            model: str(params.model),
            parentId: str(params.parentId),
            entryId: str(params.entryId),
          }));

        case "resumeSession":
          return ok(id, this.engine.resumeSession(str(params.sessionId) ?? ""));

        case "getSessionDetail":
          return ok(id, this.engine.getSessionDetail(str(params.sessionId) ?? ""));

        case "renameSession":
          return ok(id, this.engine.renameSession(str(params.sessionId) ?? "", str(params.title) ?? ""));

        case "deleteSession":
          return ok(id, this.engine.deleteSession(str(params.sessionId) ?? ""));

        case "prompt": {
          const sessionId = str(params.sessionId) ?? "";
          const done = await this.engine.prompt(sessionId, {
            text: str(params.text) ?? "",
            mode: params.mode === "plan" ? "plan" : params.mode === "build" ? "build" : undefined,
            thinkingLevel: validThinking(params.thinkingLevel),
          });
          return ok(id, { accepted: done });
        }

        case "abort":
          this.engine.abort(str(params.sessionId) ?? "");
          return ok(id, { aborted: true });

        case "branchSession":
          return ok(id, this.engine.branchSession(str(params.sessionId) ?? "", str(params.entryId) ?? ""));

        case "listModels":
          return ok(id, this.catalog.snapshot().models);

        case "listProviders":
          return ok(id, this.catalog.snapshot().providers);

        case "setApiKey": {
          const provider = str(params.provider) ?? "";
          const key = str(params.key) ?? "";
          if (!provider || !key) return err(id, 400, "provider and key are required");
          const okLive = this.engine.setApiKey(provider, key);
          return ok(id, { accepted: okLive, note: okLive ? "key stored for this worker session" : "key ignored (live engine unavailable)" });
        }

        case "setModel":
          return ok(id, this.engine.setModel(str(params.sessionId) ?? "", str(params.modelId) ?? ""));

        case "setThinkingLevel":
          return ok(id, this.engine.setThinkingLevel(str(params.sessionId) ?? "", validThinking(params.level) ?? "medium"));

        case "setPlanMode":
          return ok(id, this.engine.setPlanMode(str(params.sessionId) ?? "", params.enabled === true));

        case "getSettings":
          return ok(id, {
            autoTitle: true,
            confirmDestructiveTools: true,
            showToolArguments: true,
            streamRules: true,
            memoryBackend: "off",
          });

        case "setSettings":
          return ok(id, { saved: true });

        case "listMemory":
          return ok(id, this.engine.listMemory(str(params.sessionId) ?? ""));

        case "getPlan":
          return ok(id, this.engine.getPlan(str(params.sessionId) ?? ""));

        case "listAgents":
          return ok(id, this.engine.listAgents(str(params.sessionId) ?? ""));

        case "getDiffs":
          return ok(id, this.engine.getDiffs(str(params.sessionId) ?? ""));

        case "getFileTree":
          return ok(id, this.engine.getFileTree());

        default:
          return err(id, -32601, `unknown method: ${method}`);
      }
    } catch (e) {
      console.error(`[rpc] ${method} failed:`, e);
      return err(id, -32603, e instanceof Error ? e.message : String(e));
    }
  }
}

function ok<T>(id: number, result: T): RpcResponse<T> {
  return { id, result };
}

function err(id: number, code: number, message: string): RpcResponse {
  return { id, error: { code, message } };
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function validThinking(v: unknown): "low" | "medium" | "high" | "ultra" | undefined {
  return v === "low" || v === "medium" || v === "high" || v === "ultra" ? v : undefined;
}
