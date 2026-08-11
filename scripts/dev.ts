// Dev orchestrator: starts the omp worker (port 8787) and the Vite dev server
// (PORT, default 5173) in one process. Vite proxies /api and /ws to the worker.
import { join } from "node:path";

const root = join(import.meta.dir, "..");

// Env must be set before the worker module evaluates (its config is read at
// module load), so use a dynamic import below.
process.env.OMP_PROJECT_ROOT = process.env.OMP_PROJECT_ROOT ?? root;
process.env.WORKER_PORT = process.env.WORKER_PORT ?? "8787";
process.env.PORT = process.env.PORT ?? "5173";

const { main: startWorker } = await import("../packages/worker/src/index.ts");

// Start the worker first (registers Bun.serve and keeps the process alive).
const worker = startWorker().catch((err) => {
  console.error("[dev] worker failed to start:", err);
  process.exit(1);
});

// Then the Vite dev server.
const { createServer } = await import("vite");
const vite = await createServer({
  configFile: join(root, "packages/ui/vite.config.ts"),
});
await vite.listen();
vite.printUrls();

await worker;
