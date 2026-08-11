import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  ListChecks,
  Loader2,
  MemoryStick,
  Network,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import type { AgentInfo, FileNode, PlanTask } from "@omp/shared";
import { useStudio, type RightPanel as PanelKey } from "../../lib/store";
import { formatCost, formatNumber, timeAgo } from "../../lib/format";
import { Badge, PanelHeader } from "../ui";
import { DiffViewer } from "./DiffViewer";

/* ---------- Plan ---------- */

function PlanPanel({ plan }: { plan: PlanTask[] }) {
  if (plan.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-[12.5px] leading-relaxed text-ink-faint">
        No plan yet.
        <br />
        Toggle <span className="font-medium text-omp-700">Plan mode</span> and describe a change — the agent will research
        and lay out phases here.
      </div>
    );
  }
  const phases = [...new Set(plan.map((t) => t.phase))];
  return (
    <div className="space-y-4 px-4 py-3">
      {phases.map((phase) => (
        <div key={phase}>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{phase}</div>
          <div className="space-y-1.5">
            {plan
              .filter((t) => t.phase === phase)
              .map((t) => (
                <div key={t.id} className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-2">
                  {t.status === "done" ? (
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-omp-600" />
                  ) : t.status === "in_progress" ? (
                    <Loader2 size={15} className="mt-0.5 shrink-0 animate-spin text-sky-600" />
                  ) : (
                    <CircleDot size={15} className="mt-0.5 shrink-0 text-ink-faint" />
                  )}
                  <span className={`text-[13px] leading-snug ${t.status === "done" ? "text-ink-soft line-through decoration-line-strong" : t.status === "in_progress" ? "font-medium text-ink" : "text-ink"}`}>
                    {t.text}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Agents ---------- */

function AgentRow({ agent }: { agent: AgentInfo }) {
  const [open, setOpen] = useState(false);
  const running = agent.status === "running";
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left">
        {running ? (
          <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-sky-200" />
            <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <Network size={12} />
            </span>
          </span>
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dusk-100 text-ink-soft">
            <Network size={12} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[12.5px] font-semibold">{agent.name}</span>
            {agent.status === "done" && <Badge tone="green">done</Badge>}
            {agent.status === "error" && <Badge tone="red">error</Badge>}
          </span>
          <span className="block truncate text-[11px] text-ink-soft">{agent.task}</span>
        </span>
        {agent.usage?.cost !== undefined && <span className="shrink-0 text-[10.5px] font-mono text-ink-faint">{formatCost(agent.usage.cost)}</span>}
        {open ? <ChevronDown size={13} className="shrink-0 text-ink-faint" /> : <ChevronRight size={13} className="shrink-0 text-ink-faint" />}
      </button>
      {open && agent.usage && (
        <div className="border-t border-line bg-dusk-50/50 px-3 py-2 font-mono text-[10.5px] text-ink-faint">
          in {formatNumber(agent.usage.input)} · out {formatNumber(agent.usage.output)}
          {agent.model ? ` · ${agent.model}` : ""}
          {agent.startedAt ? ` · started ${timeAgo(agent.startedAt)}` : ""}
        </div>
      )}
    </div>
  );
}

function AgentsPanel({ agents }: { agents: AgentInfo[] }) {
  if (agents.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-[12.5px] leading-relaxed text-ink-faint">
        No subagents yet.
        <br />
        Ask for parallel work — <span className="font-medium text-ink">“spin up subagents to map the repo”</span> — and
        they'll show up here.
      </div>
    );
  }
  const running = agents.filter((a) => a.status === "running");
  const done = agents.filter((a) => a.status !== "running");
  return (
    <div className="space-y-3 px-4 py-3">
      {running.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
            <Loader2 size={10} className="animate-spin" /> active
          </div>
          <div className="space-y-1.5">
            {running.map((a) => (
              <AgentRow key={a.id} agent={a} />
            ))}
          </div>
        </div>
      )}
      {done.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">finished</div>
          <div className="space-y-1.5">
            {done.map((a) => (
              <AgentRow key={a.id} agent={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Files ---------- */

function FileTreeRow({ node, depth }: { node: FileNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const isDir = node.type === "dir";
  return (
    <div>
      <button
        onClick={() => isDir && setOpen((v) => !v)}
        className={`flex w-full items-center gap-1.5 rounded-md px-2 py-[3px] text-left transition-colors hover:bg-dusk-100 ${isDir ? "" : "cursor-default"}`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {isDir ? (
          open ? <FolderOpen size={12} className="shrink-0 text-amber-500" /> : <Folder size={12} className="shrink-0 text-amber-500" />
        ) : (
          <FileCode2 size={12} className="shrink-0 text-ink-faint" />
        )}
        <span className={`truncate text-[12px] ${isDir ? "font-medium text-ink" : "text-ink-soft"}`}>{node.name}</span>
        {!isDir && node.size !== undefined && <span className="ml-auto font-mono text-[9.5px] text-ink-faint">{formatNumber(node.size)}B</span>}
      </button>
      {isDir && open && node.children && (
        <div>
          {node.children.map((c) => (
            <FileTreeRow key={c.path} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilesPanel({ tree }: { tree: FileNode[] }) {
  if (tree.length === 0) {
    return <div className="px-4 py-8 text-center text-[12.5px] text-ink-faint">No workspace files.</div>;
  }
  return (
    <div className="px-2 py-2">
      {tree.map((n) => (
        <FileTreeRow key={n.path} node={n} depth={0} />
      ))}
    </div>
  );
}

/* ---------- Memory ---------- */

function MemoryPanel({ memory }: { memory: { id: string; kind: "fact" | "lesson" | "summary"; content: string; tags?: string[]; createdAt: number }[] }) {
  if (memory.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-[12.5px] leading-relaxed text-ink-faint">
        The memory bank is empty.
        <br />
        Say <span className="font-medium text-ink">“remember that I prefer light mode”</span> and the agent will retain it here.
      </div>
    );
  }
  return (
    <div className="space-y-1.5 px-4 py-3">
      {memory.map((m) => (
        <div key={m.id} className="rounded-lg border border-line bg-surface px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <MemoryStick size={11} className="text-omp-600" />
            <Badge tone={m.kind === "lesson" ? "violet" : m.kind === "summary" ? "blue" : "green"}>{m.kind}</Badge>
            {m.tags?.map((t) => (
              <span key={t} className="rounded bg-dusk-100 px-1 py-px font-mono text-[10px] text-ink-soft">#{t}</span>
            ))}
            <span className="ml-auto text-[10px] text-ink-faint">{timeAgo(m.createdAt)}</span>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink">{m.content}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- LSP / Debugger ---------- */

function LspPanel({ lspCalls, debugCalls }: { lspCalls: { summary?: string; result?: string }[]; debugCalls: { summary?: string; result?: string }[] }) {
  return (
    <div className="space-y-4 px-4 py-3">
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
          <Brain size={10} /> language server
        </div>
        <div className="rounded-lg border border-line bg-surface p-2.5">
          <div className="flex items-center gap-2 text-[12px]">
            <span className="h-1.5 w-1.5 rounded-full bg-omp-500" />
            <span className="font-medium">workspace LSP</span>
            <span className="ml-auto text-[10.5px] text-ink-faint">available</span>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">
            The agent renames through <span className="font-mono text-[10.5px]">workspace/willRenameFiles</span> and resolves
            references via the server — not string matching.
          </p>
        </div>
        {lspCalls.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {lspCalls.map((c, i) => (
              <div key={i} className="rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-[11px] text-ink-soft">
                <span className="text-indigo-600">lsp</span> {c.summary}
                {c.result && <div className="mt-1 whitespace-pre-line text-[10.5px] text-ink-faint">{c.result}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
          <CircleDot size={10} /> debugger (DAP)
        </div>
        <div className="rounded-lg border border-line bg-surface p-2.5">
          <div className="flex items-center gap-2 text-[12px]">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
            <span className="font-medium">no session attached</span>
            <span className="ml-auto text-[10.5px] text-ink-faint">lldb · dlv · debugpy</span>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">
            Ask the agent to debug something — attach, breakpoints, stepping, and stack/variable inspection surface here.
          </p>
        </div>
        {debugCalls.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {debugCalls.map((c, i) => (
              <div key={i} className="rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-[11px] text-ink-soft">
                <span className="text-rose-600">debug</span> {c.summary}
                {c.result && <div className="mt-1 whitespace-pre-line text-[10.5px] text-ink-faint">{c.result}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Panel shell ---------- */

const TABS: { key: PanelKey; label: string; icon: typeof ListChecks }[] = [
  { key: "plan", label: "Plan", icon: ListChecks },
  { key: "agents", label: "Agents", icon: Network },
  { key: "diffs", label: "Diffs", icon: GitBranch },
  { key: "files", label: "Files", icon: Folder },
  { key: "memory", label: "Memory", icon: MemoryStick },
  { key: "lsp", label: "LSP", icon: Brain },
];

export function RightPanel() {
  const rightPanel = useStudio((s) => s.rightPanel);
  const setRightPanel = useStudio((s) => s.setRightPanel);
  const detail = useStudio((s) => s.detail);
  const fileTree = useStudio((s) => s.fileTree);

  if (!rightPanel) return null;

  const lspCalls = (detail?.messages ?? [])
    .flatMap((m) => m.toolCalls ?? [])
    .filter((t) => t.name === "lsp")
    .map((t) => ({ summary: t.summary, result: t.result }));
  const debugCalls = (detail?.messages ?? [])
    .flatMap((m) => m.toolCalls ?? [])
    .filter((t) => t.name === "debug")
    .map((t) => ({ summary: t.summary, result: t.result }));

  return (
    <aside className="flex w-[330px] shrink-0 flex-col border-l border-line bg-surface">
      <div className="flex items-center gap-1 border-b border-line px-2 pt-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setRightPanel(rightPanel === key ? null : key)}
            className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-2.5 py-2 text-[12px] font-medium transition-colors ${
              rightPanel === key ? "border-omp-600 text-omp-700" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            <Icon size={12} />
            {label}
            {key === "diffs" && (detail?.diffs.length ?? 0) > 0 && (
              <span className="rounded-full bg-omp-100 px-1 text-[10px] font-semibold text-omp-700">{detail!.diffs.length}</span>
            )}
          </button>
        ))}
        <button onClick={() => setRightPanel(null)} className="ml-auto p-1.5 text-ink-faint transition-colors hover:text-ink">
          <X size={13} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={rightPanel}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.14 }}
            className="min-h-full"
          >
            {rightPanel === "plan" && <PlanPanel plan={detail?.plan ?? []} />}
            {rightPanel === "agents" && <AgentsPanel agents={detail?.agents ?? []} />}
            {rightPanel === "diffs" &&
              ((detail?.diffs.length ?? 0) === 0 ? (
                <div className="px-4 py-8 text-center text-[12.5px] leading-relaxed text-ink-faint">
                  No diffs yet.
                  <br />
                  Ask for an edit and the patch will preview here before it's applied.
                </div>
              ) : (
                <div className="space-y-2 px-3 py-3">
                  {detail!.diffs.map((d, i) => (
                    <DiffViewer key={`${d.path}-${i}`} diff={d} />
                  ))}
                </div>
              ))}
            {rightPanel === "files" && <FilesPanel tree={fileTree} />}
            {rightPanel === "memory" && <MemoryPanel memory={detail?.memory ?? []} />}
            {rightPanel === "lsp" && <LspPanel lspCalls={lspCalls} debugCalls={debugCalls} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="border-t border-line bg-dusk-50/60 px-4 py-2 text-[10.5px] text-ink-faint">
        {detail?.model ? `model: ${detail.model}` : "model: —"} · {detail?.messages.length ?? 0} messages
      </div>
    </aside>
  );
}
