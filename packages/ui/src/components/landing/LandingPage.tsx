import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Braces,
  Bug,
  CheckCircle2,
  CircleDot,
  FileDiff,
  GitBranch,
  Layers,
  ListTodo,
  MessageSquareText,
  Network,
  Play,
  Settings2,
  Sparkles,
  TerminalSquare,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../ui";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const FEATURES = [
  {
    icon: ListTodo,
    title: "Plan mode",
    desc: "Flip a switch and the agent researches first, then hands back a phased plan for your approval before touching a file.",
    accent: "text-omp-600 bg-omp-50 border-omp-200",
  },
  {
    icon: Network,
    title: "Subagent hub",
    desc: "Fan work out across isolated subagents in parallel — each with its own tool surface — and watch them live from the hub.",
    accent: "text-sky-600 bg-sky-50 border-sky-200",
  },
  {
    icon: Braces,
    title: "Hash-anchored edits",
    desc: "Edits anchor on content hashes, not fragile string matches. Stale anchors reject the patch before it corrupts anything.",
    accent: "text-violet-600 bg-violet-50 border-violet-200",
  },
  {
    icon: Bug,
    title: "LSP & debugger",
    desc: "Rename through the language server, attach a real DAP debugger, step frames, inspect locals — everything your IDE knows.",
    accent: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    icon: CircleDot,
    title: "Memory & skills",
    desc: "The agent curates a project-scoped memory bank — facts, lessons, recall — so context survives between sessions.",
    accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    icon: Zap,
    title: "60+ providers",
    desc: "Anthropic, OpenAI, Gemini, Groq, xAI, OpenRouter, Ollama and more — 4,200+ models, mixable per role, with fallback chains.",
    accent: "text-rose-600 bg-rose-50 border-rose-200",
  },
];

const PROVIDERS = [
  "Anthropic",
  "OpenAI",
  "Gemini",
  "Groq",
  "xAI",
  "DeepSeek",
  "Mistral",
  "OpenRouter",
  "Cerebras",
  "Together",
  "Fireworks",
  "Ollama",
  "LM Studio",
  "vLLM",
  "Bedrock",
  "Azure",
  "Copilot",
  "Cursor",
  "Qwen",
  "MiniMax",
];

const TOOL_ROWS: { name: string; status: "done" | "run" | "pending"; detail: string }[][] = [
  [
    { name: "read", status: "done", detail: "packages/worker/src/index.ts · 214 lines" },
    { name: "grep", status: "done", detail: "“TODO|FIXME” · 5 matches" },
    { name: "lsp", status: "run", detail: "references · formatBytes" },
    { name: "edit", status: "pending", detail: "hash-anchored patch" },
  ],
];

function Logo({ size = 26 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex items-center justify-center rounded-xl bg-ink text-white shadow-card"
        style={{ width: size + 4, height: size + 4 }}
      >
        <TerminalSquare size={size * 0.6} strokeWidth={2.2} />
      </div>
      <div className="leading-none">
        <div className="text-[15px] font-bold tracking-tight">
          OMP <span className="text-omp-600">Studio</span>
        </div>
        <div className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">Oh My Pi · desktop</div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-[13.5px] font-medium text-ink-soft md:flex">
            <a href="#features" className="transition-colors hover:text-ink">Features</a>
            <a href="#engine" className="transition-colors hover:text-ink">Engine</a>
            <a href="#providers" className="transition-colors hover:text-ink">Providers</a>
            <a href="#faq" className="transition-colors hover:text-ink">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/app" className="hidden text-[13.5px] font-medium text-ink-soft transition-colors hover:text-ink sm:block">
              Open Studio
            </Link>
            <Link
              to="/app"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink px-4 text-[13.5px] font-semibold text-white shadow-card transition-all hover:bg-black active:scale-[0.98]"
            >
              Launch Studio
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_35%,transparent_75%)]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
              <Badge tone="green" className="mb-5 px-3 py-1 text-[12px]">
                <Sparkles size={12} />
                The Oh My Pi coding agent, on the desktop
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={1}
              className="text-balance text-4xl font-bold tracking-[-0.03em] sm:text-6xl"
            >
              A coding agent with the
              <br className="hidden sm:block" /> <span className="text-omp-600">IDE wired in.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={2}
              className="mx-auto mt-5 max-w-xl text-pretty text-[16px] leading-relaxed text-ink-soft"
            >
              OMP Studio is a clean, light, Codex-style workspace for Oh My Pi — subagents, plan mode, LSP &amp; DAP,
              memory, hash-anchored edits, and every provider you already pay for. Same engine. Better surface.
            </motion.p>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="mt-8 flex items-center justify-center gap-3">
              <Link
                to="/app"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-6 text-[15px] font-semibold text-white shadow-card transition-all hover:bg-black active:scale-[0.98]"
              >
                <Play size={15} fill="currentColor" />
                Launch Studio
              </Link>
              <a
                href="#features"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-6 text-[15px] font-semibold text-ink transition-all hover:border-omp-600/50 hover:text-omp-700 active:scale-[0.98]"
              >
                Explore features
              </a>
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[12.5px] font-medium text-ink-faint">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-omp-600" /> 60+ providers</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-omp-600" /> 4,200+ models</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-omp-600" /> 31 built-in tools</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-omp-600" /> Plan mode · subagents</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-omp-600" /> LSP · DAP · memory</span>
            </motion.div>
          </div>

          {/* studio mock */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-14 max-w-4xl"
          >
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
              <div className="flex items-center gap-2 border-b border-line bg-dusk-50 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <div className="ml-3 flex-1 rounded-md border border-line bg-surface px-3 py-1 font-mono text-[11px] text-ink-faint">
                  omp studio — omp-desktop
                </div>
              </div>
              <div className="grid grid-cols-[180px_1fr]">
                <div className="hidden border-r border-line bg-dusk-50/60 p-3 sm:block">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-ink-faint">
                    <MessageSquareText size={12} /> Sessions
                  </div>
                  <div className="space-y-1.5">
                    <div className="rounded-lg border border-omp-200 bg-omp-50 px-2.5 py-1.5">
                      <div className="text-[11.5px] font-semibold text-omp-800">Map the worker RPC</div>
                      <div className="text-[10px] text-ink-faint">2m ago</div>
                    </div>
                    <div className="rounded-lg px-2.5 py-1.5">
                      <div className="text-[11.5px] font-medium text-ink">Plan: settings page</div>
                      <div className="text-[10px] text-ink-faint">1h ago</div>
                    </div>
                    <div className="rounded-lg px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink"><GitBranch size={11} className="text-omp-600" /> Branch · auth flow</div>
                      <div className="text-[10px] text-ink-faint">yesterday</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-[13px] font-bold text-white">⌥</div>
                    <div>
                      <div className="text-[12.5px] font-semibold">Map the worker RPC surface</div>
                      <div className="text-[10.5px] text-ink-faint">anthropic · claude-sonnet-4-5</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 font-mono text-[11px]">
                    <div className="flex items-center gap-2 rounded-lg border border-line bg-dusk-50 px-2.5 py-1.5">
                      <CheckCircle2 size={12} className="shrink-0 text-omp-600" />
                      <span className="font-semibold text-ink">read</span>
                      <span className="truncate text-ink-soft">packages/worker/src/index.ts</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-line bg-dusk-50 px-2.5 py-1.5">
                      <CircleDot size={12} className="shrink-0 animate-pulse text-sky-600" />
                      <span className="font-semibold text-ink">task</span>
                      <span className="truncate text-ink-soft">fan-out · 2 subagents</span>
                    </div>
                    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-ink-soft">
                      The worker exposes <span className="text-ink">12 RPC methods</span> — sessions, prompt/abort,
                      branching, the model catalog… <span className="animate-pulse-soft">▍</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="border-t border-line bg-surface py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl">Everything omp does. Zero terminal required.</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">
              The same engine you'd drive in the TUI — rendered as clean tool cards, diffs, and panels in a light,
              uncluttered workspace.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-40px" }}
                custom={i}
                className="group rounded-2xl border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card"
              >
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${f.accent}`}>
                  <f.icon size={17} strokeWidth={2} />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ultrathink band */}
      <section className="border-t border-line bg-gradient-to-b from-surface to-canvas py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0}>
            <Badge tone="violet" className="mb-5 px-3 py-1 text-[12px]">
              <Sparkles size={12} /> magic keyword
            </Badge>
            <h2 className="text-balance text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
              Type <span className="rainbow-text font-bold">ultrathink</span> and watch it <em>glow</em>.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-soft">
              omp's magic keywords opt a turn into specialized behavior. OMP Studio makes them visible — the composer
              lights up in rainbow, and the agent goes all-in on careful multi-step reasoning.
            </p>
            <div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 font-mono text-[13px] shadow-card">
              <span className="text-ink-faint">$</span>
              <span className="text-ink">plan</span>
              <span className="text-ink-soft">a settings page,</span>
              <span className="rainbow-text font-bold">ultrathink</span>
              <span className="text-ink-soft">it</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* engine */}
      <section id="engine" className="border-t border-line bg-surface py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div>
            <Badge tone="green" className="mb-4"><Layers size={12} /> engine</Badge>
            <h2 className="text-balance text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
              The real omp SDK, embedded in a Bun worker.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-ink-soft">
              OMP Studio embeds <span className="font-mono text-[13.5px] text-ink">@oh-my-pi/pi-coding-agent</span> in a
              local Bun worker. Sessions, streaming events, tool executions, the full model catalog — everything streams
              to the UI over WebSocket. No cloud, no proxy, no second brain.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Sessions & branching — fork any checkpoint, keep the whole tree.",
                "Tool cards stream live — read, grep, edit, bash, task, lsp, debug.",
                "Diffs land as reviewable patches before they hit disk.",
                "Real-only workspace — connect a provider before any model or session becomes available.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] text-ink-soft">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-omp-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-canvas p-5 font-mono text-[12px] leading-relaxed shadow-card">
            <div className="mb-3 flex items-center gap-1.5 text-[11px] text-ink-faint">
              <TerminalSquare size={12} /> worker.ts
            </div>
            <pre className="overflow-x-auto text-ink-soft">
{`import { createAgentSession, ModelRegistry, discoverAuthStorage } from "@oh-my-pi/pi-coding-agent";

const auth = await discoverAuthStorage();
const models = new ModelRegistry(auth);
await models.refresh();

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage: auth,
  modelRegistry: models,
});

session.subscribe((event) => {
  if (event.type === "tool_execution_start") {
    ui.pushToolCard({ name: event.toolName, args: event.args });
  }
});

await session.prompt("map the worker RPC surface");`}
            </pre>
          </div>
        </div>
      </section>

      {/* providers */}
      <section id="providers" className="border-t border-line bg-canvas py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl">Every provider you already pay for.</h2>
            <p className="mt-3 text-[15.5px] text-ink-soft">
              Frontier APIs, coding plans, local servers, custom OpenAI-compatible endpoints — mix any model into any
              role, with fallback chains and round-robin keys.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {PROVIDERS.map((p) => (
              <span key={p} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:border-omp-300 hover:text-omp-700">
                {p}
              </span>
            ))}
            <span className="rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] font-semibold text-white">+ 40 more</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line bg-surface py-20">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <div className="rainbow-glow rounded-3xl border border-line bg-canvas p-10">
            <h2 className="text-balance text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
              Your terminal stays open. <span className="text-omp-600">So does the agent.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
              Launch the studio, say hello, and watch the agent read this very repo.
            </p>
            <Link
              to="/app"
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-ink px-7 text-[15px] font-semibold text-white shadow-card transition-all hover:bg-black active:scale-[0.98]"
            >
              <Play size={15} fill="currentColor" />
              Launch OMP Studio
            </Link>
            <div className="mt-4 text-[12px] text-ink-faint">Free · local worker · no account needed</div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer id="faq" className="border-t border-line bg-canvas py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <Logo size={20} />
          <div className="text-[12.5px] text-ink-faint">
            OMP Studio · a branded wrapper around <a href="https://omp.sh" target="_blank" rel="noreferrer" className="font-medium text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-omp-700">Oh My Pi (omp.sh)</a>
          </div>
          <div className="flex items-center gap-4 text-[12.5px] font-medium text-ink-soft">
            <a href="https://omp.sh/docs" target="_blank" rel="noreferrer" className="hover:text-ink">Docs</a>
            <a href="https://github.com/can1357/oh-my-pi" target="_blank" rel="noreferrer" className="hover:text-ink">GitHub</a>
            <Link to="/app" className="text-omp-700 hover:text-omp-800">Studio →</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
