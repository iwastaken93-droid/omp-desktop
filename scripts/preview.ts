// Preview orchestrator for managed environments: ensures the UI is built, then
// starts the worker which serves both the RPC/WS API and the static UI on one
// port (PORT, default 8787) bound to 0.0.0.0.
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");

// Env must be set before the worker module evaluates (its config is read at
// module load), so use a dynamic import below.
process.env.OMP_PROJECT_ROOT = process.env.OMP_PROJECT_ROOT ?? root;
process.env.STATIC_DIR = process.env.STATIC_DIR ?? "dist";
process.env.PORT = process.env.PORT ?? "8787";

if (!existsSync(join(dist, "index.html"))) {
  console.log("[preview] UI build missing — building first…");
  const build = Bun.spawnSync(["bun", "run", "--filter", "@omp/ui", "build"], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (build.exitCode !== 0) {
    console.error("[preview] UI build failed");
    process.exit(build.exitCode ?? 1);
  }
}

const { main: startWorker } = await import("../packages/worker/src/index.ts");
await startWorker();
