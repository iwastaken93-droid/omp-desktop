import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The omp worker runs on WORKER_PORT (default 8787) and speaks the JSON-RPC
// protocol over /ws and /api. In dev, Vite proxies those paths to the worker
// so the browser only ever talks to one origin. HMR stays disabled (managed
// environments reload the preview themselves).
export default defineConfig({
  plugins: [react()],
  // Emit to the repo-root dist/ so managed hosting finds the static output.
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 5173,
    hmr: false,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.WORKER_PORT || 8787}`,
        changeOrigin: true,
      },
      "/ws": {
        target: `ws://127.0.0.1:${process.env.WORKER_PORT || 8787}`,
        ws: true,
      },
    },
  },
});
