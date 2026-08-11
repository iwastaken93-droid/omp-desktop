"use strict";

// OMP Studio desktop shell.
//
// Spawns the bundled omp worker (bun.exe + worker.js, shipped under
// resources/omp-resources) on a random loopback port, waits for its health
// endpoint, then loads the UI it serves. The worker exits when the app quits.

const { app, BrowserWindow, dialog } = require("electron");
const { spawn, spawnSync } = require("node:child_process");
const { join } = require("node:path");
const { createServer } = require("node:net");
const { get: httpGet } = require("node:http");

const DEV = !!process.env.OMP_DESKTOP_DEV;

let worker = null;
let port = null;
let win = null;

function pickPort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
  });
}

function waitForHealth(url, timeoutMs = 40000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error("worker did not become ready in time"));
        return;
      }
      setTimeout(attempt, 300);
    };
    const attempt = () => {
      const req = httpGet(url, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else retry();
      });
      req.on("error", retry);
      req.setTimeout(3000, () => {
        req.destroy();
        retry();
      });
    };
    attempt();
  });
}

async function startWorker() {
  const resources = DEV
    ? join(__dirname, "..", "..", "desktop-resources")
    : join(process.resourcesPath, "omp-resources");
  const bunPath = DEV ? "bun" : join(resources, "bun", "bun.exe");
  const workerPath = join(resources, "worker", "worker.js");

  port = await pickPort();
  console.log(`[omp-studio] starting worker on 127.0.0.1:${port}`);

  worker = spawn(bunPath, [workerPath], {
    cwd: join(resources, "worker"),
    env: {
      ...process.env,
      PORT: String(port),
      OMP_PROJECT_ROOT: join(resources, "worker"),
      STATIC_DIR: join(resources, "ui"),
      OMP_CONFIG_DIR: join(app.getPath("userData"), "config"),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  worker.stdout.on("data", (d) => console.log("[worker]", String(d).trimEnd()));
  worker.stderr.on("data", (d) => console.error("[worker]", String(d).trimEnd()));
  worker.on("exit", (code) => {
    console.log(`[worker] exited with code ${code}`);
    if (!app.isQuitting) app.quit();
  });

  await waitForHealth(`http://127.0.0.1:${port}/api/health`);
  console.log("[omp-studio] worker healthy");
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: "#fafaf9",
    autoHideMenuBar: true,
    title: "OMP Studio",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.once("ready-to-show", () => win.show());
  win.loadURL(`http://127.0.0.1:${port}/`);
  win.on("closed", () => {
    win = null;
  });
}

function killWorker() {
  if (!worker || worker.exitCode !== null) return;
  try {
    worker.kill();
  } catch {
    /* ignore */
  }
  if (process.platform === "win32") {
    const pid = worker.pid;
    setTimeout(() => {
      try {
        spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
      } catch {
        /* ignore */
      }
    }, 1500).unref();
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(async () => {
    try {
      await startWorker();
      createWindow();
    } catch (err) {
      console.error("[omp-studio] startup failed:", err);
      dialog.showErrorBox(
        "OMP Studio failed to start",
        err instanceof Error ? err.message : String(err),
      );
      app.quit();
    }
  });

  app.on("will-quit", killWorker);
  app.on("window-all-closed", () => app.quit());
}
