import { existsSync, statSync } from "node:fs";
import { extname, isAbsolute, join, normalize } from "node:path";
import type { ServerWebSocket } from "bun";
import type { RpcNotification, RpcRequest, RpcResponse } from "@omp/shared";
import { Catalog } from "./catalog";
import { EngineFacade } from "./engines/engine";
import { LiveEngine } from "./engines/live";
import { RpcServer } from "./rpc";

const PROJECT_ROOT = process.env.OMP_PROJECT_ROOT || process.cwd();
const STATIC_DIR = (() => {
  const raw = process.env.STATIC_DIR;
  if (!raw) return null;
  return isAbsolute(raw) ? raw : join(PROJECT_ROOT, raw);
})();
const PORT = Number(process.env.PORT || process.env.WORKER_PORT || 8787);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

export async function main(): Promise<void> {
  console.log("[omp-worker] starting…");
  console.log(`[omp-worker] project root: ${PROJECT_ROOT}`);

  const clients = new Set<ServerWebSocket<undefined>>();

  const sink = (sessionId: string, data: RpcNotification["data"]) => {
    const notif: RpcNotification = { event: "agent_event", sessionId, data };
    const payload = JSON.stringify(notif);
    for (const ws of clients) {
      if (ws.readyState === 1) ws.send(payload);
    }
  };

  const live = new LiveEngine(sink);
  const facade = new EngineFacade(live, null, sink);

  const liveReady = await live.ensureReady();
  // The catalog always comes from omp. When the SDK cannot load we expose an
  // empty catalog rather than inventing models or falling back to a simulator.
  const catalog = liveReady ? (live.registry().getAll().length ? await Catalog.create(() => live.registry(), async () => {
    const oauthApi = await import("@oh-my-pi/pi-ai/oauth");
    return oauthApi.getOAuthProviders().map((provider) => ({ id: String(provider.id), name: provider.name, storeCredentialsAs: provider.storeCredentialsAs ? String(provider.storeCredentialsAs) : undefined }));
  }) : Catalog.empty()) : Catalog.empty();

  const rpc = new RpcServer(facade, catalog);

  const server = Bun.serve({
    port: PORT,
    hostname: "0.0.0.0",
    fetch(req, srv) {
      const url = new URL(req.url);

      if (url.pathname === "/api/health") {
        return Response.json({
          ok: true,
          engine: "omp",
          providersConfigured: facade.getConfiguredProviders(),
          catalogModels: catalog.allModels.length,
          ts: Date.now(),
        });
      }

      if (url.pathname === "/api/catalog") {
        return Response.json(catalog.snapshot());
      }

      if (url.pathname === "/ws" || url.pathname === "/api/ws") {
        if (srv.upgrade(req)) return new Response(null, { status: 101 });
        return new Response("websocket upgrade failed", { status: 400 });
      }

      if (STATIC_DIR) {
        const result = serveStatic(url.pathname);
        if (result) return result;
      }

      return new Response("Not found", { status: 404 });
    },
    websocket: {
      open(ws) {
        clients.add(ws);
        ws.send(JSON.stringify({ id: 0, result: { connected: true, engine: "omp" } }));
      },
      async message(ws, raw) {
        let req: RpcRequest;
        try {
          req = JSON.parse(String(raw));
        } catch {
          ws.send(JSON.stringify({ id: null, error: { code: -32700, message: "parse error" } }));
          return;
        }
        const res: RpcResponse = await rpc.handle(req);
        ws.send(JSON.stringify(res));
      },
      close(ws) {
        clients.delete(ws);
      },
    },
  });

  console.log(`[omp-worker] listening on http://0.0.0.0:${PORT}`);
  console.log(`[omp-worker] engine: live omp SDK${facade.isUsable() ? " (provider configured)" : " (awaiting provider configuration)"}`);
  console.log(`[omp-worker] catalog: ${catalog.allModels.length} models across ${catalog.snapshot().providers.length} providers`);
  if (STATIC_DIR)  console.log(`[omp-worker] serving static UI from ${STATIC_DIR}`);
}

function serveStatic(pathname: string): Response | null {
  if (!STATIC_DIR) return null;
  const root = normalize(STATIC_DIR);
  let filePath = normalize(join(STATIC_DIR, pathname === "/" ? "index.html" : pathname));
  if (!filePath.startsWith(root)) return new Response("Forbidden", { status: 403 });
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(STATIC_DIR, "index.html");
  }
  if (!existsSync(filePath)) return null;
  const type = MIME[extname(filePath)] ?? "application/octet-stream";
  return new Response(Bun.file(filePath), { headers: { "content-type": type } });
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("[omp-worker] fatal:", err);
    process.exit(1);
  });
}
