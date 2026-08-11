import { GitBranch, Layers, ListChecks, Network, FileDiff, Braces, Brain, CircleDot } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStudio, type RightPanel } from "../../lib/store";
import type { ThinkingLevel } from "@omp/shared";
import { Badge, Button, Segmented } from "../ui";
import { ModelPicker } from "./ModelPicker";

const PANEL_TABS: { key: RightPanel; label: string; icon: typeof Layers }[] = [
  { key: "plan", label: "Plan", icon: ListChecks },
  { key: "agents", label: "Agents", icon: Network },
  { key: "diffs", label: "Diffs", icon: FileDiff },
  { key: "files", label: "Files", icon: Braces },
  { key: "memory", label: "Memory", icon: CircleDot },
  { key: "lsp", label: "LSP", icon: Brain },
];

export function TopBar() {
  const detail = useStudio((s) => s.detail);
  const renameSession = useStudio((s) => s.renameSession);
  const planMode = useStudio((s) => s.planMode);
  const togglePlanMode = useStudio((s) => s.togglePlanMode);
  const thinkingLevel = useStudio((s) => s.thinkingLevel);
  const setThinking = useStudio((s) => s.setThinking);
  const models = useStudio((s) => s.models);
  const thinkingOptions = useStudio((s) => s.thinkingOptions);
  const rightPanel = useStudio((s) => s.rightPanel);
  const setRightPanel = useStudio((s) => s.setRightPanel);
  const busy = useStudio((s) => s.busy);
  const activeSessionId = useStudio((s) => s.activeSessionId);
  const detailDiffs = useStudio((s) => s.detail?.diffs.length ?? 0);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const title = detail?.title ?? "New session";
  const selectedModel = models.find((model) => model.id === detail?.model);
  const supportedThinking = selectedModel?.thinkingLevels ?? [];
  const visibleThinking = thinkingOptions.filter((option) => supportedThinking.includes(option.value));
  const effectiveThinking = visibleThinking.some((option) => option.value === thinkingLevel)
    ? thinkingLevel
    : visibleThinking[0]?.value ?? "off";

  const commit = () => {
    setEditing(false);
    if (activeSessionId && draft.trim() && draft.trim() !== title) void renameSession(activeSessionId, draft.trim());
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-3.5">
      <div className="flex min-w-0 items-center gap-2">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="h-7 w-64 rounded-lg border border-omp-300 bg-surface px-2.5 text-[13.5px] font-semibold outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(title);
              setEditing(true);
            }}
            title="Rename session"
            className="max-w-[320px] truncate text-left text-[13.5px] font-semibold tracking-tight hover:underline decoration-line-strong underline-offset-4"
          >
            {title}
          </button>
        )}
        {detail?.parentId && (
          <Badge tone="green" className="shrink-0">
            <GitBranch size={10} /> branch
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Segmented
          size="sm"
          value={planMode ? "plan" : "build"}
          onChange={(v) => void togglePlanMode()}
          options={[
            { value: "build", label: "Build" },
            { value: "plan", label: "Plan" },
          ]}
        />
        <select
          value={effectiveThinking}
          disabled={visibleThinking.length === 0 || busy}
          onChange={(e) => void setThinking(e.target.value as ThinkingLevel)}
          className="h-8 rounded-lg border border-line-strong bg-surface px-2 text-[12.5px] font-medium text-ink outline-none transition-colors hover:border-omp-300 disabled:opacity-50"
          title={visibleThinking.length ? "Thinking level supported by this model" : "This model exposes no thinking controls"}
        >
          {visibleThinking.length === 0 ? <option value="off">no thinking control</option> : visibleThinking.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} think
            </option>
          ))}
        </select>
        <ModelPicker align="right" />
        <div className="mx-1 h-5 w-px bg-line" />
        <div className="hidden items-center gap-1 lg:flex">
          {PANEL_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setRightPanel(rightPanel === key ? null : key)}
              className={`relative flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors ${
                rightPanel === key ? "bg-ink text-white" : "text-ink-soft hover:bg-dusk-100 hover:text-ink"
              }`}
            >
              <Icon size={13} />
              {label}
              {key === "diffs" && detailDiffs > 0 && (
                <span className={`rounded-full px-1 text-[10px] font-semibold ${rightPanel === key ? "bg-white/20" : "bg-omp-100 text-omp-700"}`}>
                  {detailDiffs}
                </span>
              )}
            </button>
          ))}
        </div>
        {busy && (
          <Button size="sm" variant="ghost" onClick={() => useStudio.getState().abort()} className="text-red-600 hover:bg-red-50 hover:text-red-700">
            Stop
          </Button>
        )}
      </div>
    </header>
  );
}
