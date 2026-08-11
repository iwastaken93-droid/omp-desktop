import { motion } from "framer-motion";
import {
  Braces,
  Bug,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  FileCode2,
  Globe,
  Github,
  Layers,
  ListChecks,
  MemoryStick,
  Network,
  Search,
  SquareTerminal,
  XCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";
import type { ToolCall } from "@omp/shared";
import { formatMs } from "../../lib/format";
import { Spinner } from "../ui";

const TOOL_ICONS: Record<string, { icon: typeof Search; color: string }> = {
  read: { icon: FileCode2, color: "text-sky-600 bg-sky-50 border-sky-200" },
  write: { icon: FileCode2, color: "text-sky-600 bg-sky-50 border-sky-200" },
  edit: { icon: FileCode2, color: "text-sky-600 bg-sky-50 border-sky-200" },
  ast_edit: { icon: Braces, color: "text-violet-600 bg-violet-50 border-violet-200" },
  ast_grep: { icon: Braces, color: "text-violet-600 bg-violet-50 border-violet-200" },
  grep: { icon: Search, color: "text-amber-600 bg-amber-50 border-amber-200" },
  glob: { icon: Search, color: "text-amber-600 bg-amber-50 border-amber-200" },
  bash: { icon: SquareTerminal, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  eval: { icon: SquareTerminal, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  lsp: { icon: Layers, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  debug: { icon: Bug, color: "text-rose-600 bg-rose-50 border-rose-200" },
  task: { icon: Network, color: "text-sky-600 bg-sky-50 border-sky-200" },
  hub: { icon: Network, color: "text-sky-600 bg-sky-50 border-sky-200" },
  todo: { icon: ListChecks, color: "text-orange-600 bg-orange-50 border-orange-200" },
  web_search: { icon: Globe, color: "text-blue-600 bg-blue-50 border-blue-200" },
  browser: { icon: Globe, color: "text-blue-600 bg-blue-50 border-blue-200" },
  github: { icon: Github, color: "text-stone-600 bg-stone-50 border-stone-200" },
  retain: { icon: MemoryStick, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  recall: { icon: MemoryStick, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  learn: { icon: MemoryStick, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  manage_skill: { icon: Zap, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
};

const FALLBACK = { icon: CircleDot, color: "text-ink-soft bg-dusk-100 border-line" };

export function ToolCard({ tool, defaultOpen = false }: { tool: ToolCall; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = TOOL_ICONS[tool.name] ?? FALLBACK;
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`overflow-hidden rounded-xl border bg-surface transition-shadow ${tool.status === "running" ? "border-sky-200 shadow-[0_0_0_3px_rgba(56,189,248,0.08)]" : tool.status === "error" ? "border-red-200" : "border-line hover:border-line-strong"}`}
    >
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.color}`}>
          <Icon size={14} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-mono text-[12.5px] font-semibold text-ink">{tool.name}</span>
            {tool.summary && <span className="truncate text-[12px] text-ink-soft">{tool.summary}</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-faint">
            {tool.status === "running" && (
              <span className="flex items-center gap-1 text-sky-600">
                <Spinner size={10} /> running…
              </span>
            )}
            {tool.status === "success" && (
              <span className="flex items-center gap-1 text-omp-700">
                <CheckCircle2 size={11} /> done
              </span>
            )}
            {tool.status === "error" && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle size={11} /> error
              </span>
            )}
            {tool.durationMs !== undefined && <span>{formatMs(tool.durationMs)}</span>}
          </span>
        </span>
        <ChevronDown size={14} className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (tool.args || tool.result) && (
        <div className="border-t border-line bg-dusk-50/50 px-3 py-2.5">
          {tool.args && (
            <div className="mb-2">
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">args</div>
              <pre className="max-h-40 overflow-auto rounded-lg border border-line bg-surface p-2.5 font-mono text-[11.5px] leading-relaxed text-ink-soft">
                {tool.args}
              </pre>
            </div>
          )}
          {tool.result && (
            <div>
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">result</div>
              <pre className="max-h-48 overflow-auto rounded-lg border border-line bg-surface p-2.5 font-mono text-[11.5px] leading-relaxed text-ink-soft">
                {tool.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
