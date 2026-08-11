# OMP Studio — Oh My Pi, desktop

A clean, light, **Codex-style desktop app for [Oh My Pi (omp)](https://omp.sh)** — the coding agent with the IDE wired in. OMP Studio embeds the real omp engine (`@oh-my-pi/pi-coding-agent`) in a local **Bun worker** and renders it as a modern web workspace: streaming chat, live tool cards, plan mode, a subagent hub, diffs, memory, and the full provider catalog.

> Branded wrapper around omp. Same engine, better surface.

## Highlights

- **Sessions & branching** — the sidebar keeps the whole session tree; fork any assistant message into a new branch.
- **Streaming chat** — markdown with code highlighting, collapsible thinking blocks, and live tool cards (read, grep, edit, bash, lsp, debug, task, web_search…).
- **Plan mode** — research-first turns with a phased task plan rendered in the Plan panel.
- **Subagent hub** — fan-out work to isolated subagents and watch them run.
- **Diffs & files** — patches preview in a diff viewer; the Files panel browses the workspace.
- **Memory & skills** — `retain`/`recall` style memory entries surface in the Memory panel.
- **LSP & debugger panels** — status and last activity from the agent's `lsp`/`debug` tool calls.
- **60+ providers, ~4,200 models** — the omp catalog is browsable in Settings, while the model picker shows only models available through configured credentials.
- **Native provider login** — API keys, local runtimes, and omp’s OAuth/device-code flows each get the right setup path, including browser authorization and manual callback input.
- **Real-only sessions** — there is no simulator fallback: with no configured provider the workspace stays empty and explains exactly how to connect one.
- **`ultrathink`** — type the magic keyword and the composer glows rainbow while the real agent thinks at maximum effort.

## Architecture

```
packages/
  shared/    JSON-RPC protocol types (UI ⇄ worker)
  worker/    Bun worker embedding @oh-my-pi/pi-coding-agent
  ui/        React + Vite studio (landing page + /app)
  desktop/   Electron shell for the Windows desktop build
scripts/
  dev.ts               dev orchestrator (worker on 8787 + Vite on PORT, proxied)
  preview.ts           preview orchestrator (builds UI if needed, worker serves UI + API on one port)
  desktop-bundle.ts    assembles the desktop payload (bundled worker + Bun.exe + natives + UI)
  gen-icon.ts          generates the 256px desktop icon (no image toolchain needed)
```

The worker exposes a WebSocket JSON-RPC API (`/ws`) plus `/api/health` and `/api/catalog`. The browser always talks to a single origin: in dev, Vite proxies `/api` and `/ws` to the worker; in preview/production, the worker serves the built UI itself.

**Engine:**

- **Live only** — `LiveEngine` embeds the omp SDK: `ModelRegistry`, `discoverAuthStorage`, `createAgentSession`, `SessionManager.inMemory()`, session events streamed 1:1 to the UI. Sessions cannot be created until a provider is actually configured.

## Getting started

Requires **Bun ≥ 1.3.14** (the omp SDK is Bun-first).

```sh
bun install

# typecheck
bun run typecheck

# dev (worker + Vite with proxy)
bun run dev

# production-style preview (single port, serves built UI)
bun run build
bun run preview
```

## Providers & API keys

The omp SDK resolves keys in this order: runtime override (pasted in Settings → Providers) → config → stored OAuth → env vars → other stored credentials.

In Freebuff, paste keys into the **API Keys** tab so they're injected as env vars, e.g.:

| Provider | Env var |
| --- | --- |
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |
| xAI | `XAI_API_KEY` |
| Groq | `GROQ_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| … | `*_API_KEY` (see Settings → Providers for each) |

OAuth providers (Cursor, GitHub Copilot, Codex, Gemini CLI, SuperGrok…) use omp’s native login flow from Settings. OMP Studio opens the provider authorization URL, forwards progress, and accepts a manual code/redirect URL when that provider requires it.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Worker (8787) + Vite dev server (PORT, default 5173), `/api` & `/ws` proxied |
| `bun run dev:worker` | Worker only |
| `bun run dev:ui` | Vite only |
| `bun run build` | `vite build` → root `dist/` |
| `bun run preview` | Build UI if missing, then single-port server (UI + worker API/WS) bound to 0.0.0.0 |
| `bun run typecheck` | `tsc -b --noEmit` |
| `bun run desktop:bundle` | Assemble `desktop-resources/` (bundled worker, Bun.exe, natives, UI) |
| `bun run desktop:win` | Bundle + build Windows installers with electron-builder |

## Windows desktop build

The desktop app is an **Electron shell that spawns the same Bun worker** locally. The worker
runs under a bundled Windows Bun runtime and ships with the `@oh-my-pi/pi-natives-win32-x64`
native addon, so the full engine — including native grep, tokenizers, and the complete
4,200+ model catalog — works offline with no cloud or terminal.

```sh
bun install
bun run desktop:win          # → packages/desktop/dist/OMP-Studio-Setup-0.1.0.exe
                             #   packages/desktop/dist/OMP-Studio-0.1.0-portable.exe
```

`desktop:win` runs `desktop-bundle.ts` (builds the UI, bundles the worker to a single
`worker.js`, downloads `bun.exe` + the win32 natives into the gitignored
`desktop-resources/`), then electron-builder produces an NSIS installer and a portable
`.exe`. Release binaries are published to the GitHub Releases page.

**Runtime layout** (`resources/omp-resources/`):

```
worker/worker.js                    – bun-bundled worker (serves UI + WebSocket API)
worker/node_modules/@oh-my-pi/      – natives loader + win32 addon
bun/bun.exe                         – Windows Bun runtime
ui/                                 – built static UI (served by the worker)
```

Notes:

- API keys pasted in Settings are persisted to `%APPDATA%/OMP Studio/config/keys.json` and
  reloaded on every launch — set them once, they survive restarts.
- The installers are **unsigned** (no code-signing certificate), so Windows SmartScreen shows
  a "More info → Run anyway" prompt on first launch.
- Bundling targets `win32-x64`. Mac/Linux desktop shells can reuse the same payload layout
  (`--linux` flag swaps in the linux natives for local testing).

## How the live engine works

```ts
const auth = await discoverAuthStorage();
const models = new ModelRegistry(auth);
await models.refresh();

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage: auth,
  modelRegistry: models,
  enableLsp: true,
  enableMCP: false,
});

session.subscribe((event) => {
  // turn_start / message_update (text_delta, thinking_delta) /
  // tool_execution_start|end / agent_end … → forwarded over /ws
});

await session.prompt("map the worker RPC surface");
```

Plan mode drives `session.setPlanModeState({ enabled, planFilePath, workflow: "parallel" })`; model switching uses `session.setModel`; thinking levels use `session.setThinkingLevel`.

## License

MIT. Built on [oh-my-pi](https://github.com/can1357/oh-my-pi) (MIT) and [Pi](https://github.com/badlogic/pi-mono) by Mario Zechner.
