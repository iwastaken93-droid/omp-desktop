import { AnimatePresence, motion } from "framer-motion";
import { GitBranch, MoreHorizontal, Pencil, Plus, Settings2, TerminalSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import { useStudio } from "../../lib/store";
import { timeAgo } from "../../lib/format";
import { Badge } from "../ui";

function SessionRow({ id, title, updatedAt, parentId, depth }: { id: string; title: string; updatedAt: number; parentId: string | null | undefined; depth: number }) {
  const activeSessionId = useStudio((s) => s.activeSessionId);
  const selectSession = useStudio((s) => s.selectSession);
  const renameSession = useStudio((s) => s.renameSession);
  const deleteSession = useStudio((s) => s.deleteSession);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  const active = activeSessionId === id;

  const commitRename = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== title) void renameSession(id, draft.trim());
  };

  return (
    <div className="group relative" style={{ paddingLeft: depth * 12 }}>
      <div
        className={`relative flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors ${
          active ? "bg-omp-50 ring-1 ring-omp-200" : "hover:bg-dusk-100"
        }`}
        onClick={() => void selectSession(id)}
      >
        {parentId ? (
          <GitBranch size={12} className="shrink-0 text-omp-600" />
        ) : (
          <TerminalSquare size={12} className="shrink-0 text-ink-faint" />
        )}
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditing(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded border border-omp-300 bg-surface px-1 py-0.5 text-[12.5px] font-medium outline-none"
            />
          ) : (
            <div className={`truncate text-[12.5px] font-medium ${active ? "text-omp-900" : "text-ink"}`}>{title}</div>
          )}
          <div className="text-[10.5px] text-ink-faint">{timeAgo(updatedAt)}</div>
        </div>
        <div
          className="relative shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setMenu((v) => !v);
          }}
        >
          <button className="rounded-md p-1 text-ink-faint opacity-0 transition-opacity hover:bg-dusk-200 group-hover:opacity-100">
            <MoreHorizontal size={13} />
          </button>
          <AnimatePresence>
            {menu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-6 z-30 w-36 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop"
                >
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] hover:bg-dusk-50"
                    onClick={() => {
                      setMenu(false);
                      setDraft(title);
                      setEditing(true);
                    }}
                  >
                    <Pencil size={12} /> Rename
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setMenu(false);
                      void deleteSession(id);
                    }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const sessions = useStudio((s) => s.sessions);
  const createSession = useStudio((s) => s.createSession);
  const openSettings = useStudio((s) => s.openSettings);
  const connected = useStudio((s) => s.connected);
  const providersConfigured = useStudio((s) => s.providersConfigured);

  const roots = sessions.filter((s) => !s.parentId);
  const byParent = (pid: string) => sessions.filter((s) => s.parentId === pid);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-dusk-50/70">
      <div className="flex items-center justify-between px-3.5 pb-2 pt-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-white">
            <TerminalSquare size={14} />
          </div>
          <div className="leading-none">
            <div className="text-[13px] font-bold tracking-tight">
              OMP <span className="text-omp-600">Studio</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => void createSession()}
          title="New session"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink-soft shadow-card transition-colors hover:border-omp-300 hover:text-omp-700"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-3 pt-1">
        <div className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint">Sessions</div>
        {sessions.length === 0 ? (
          <div className="px-2 py-6 text-center text-[12px] text-ink-faint">
            No sessions yet.
            <br />
            Start one below.
          </div>
        ) : (
          <div className="space-y-0.5">
            {roots.map((s) => (
              <div key={s.id}>
                <SessionRow id={s.id} title={s.title} updatedAt={s.updatedAt} parentId={s.parentId} depth={0} />
                {byParent(s.id).map((b) => (
                  <SessionRow key={b.id} id={b.id} title={b.title} updatedAt={b.updatedAt} parentId={b.parentId} depth={1} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-line p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-omp-500" : "animate-pulse bg-amber-500"}`} />
          <span className="text-[11.5px] font-medium text-ink-soft">
            {connected ? `${providersConfigured} provider${providersConfigured === 1 ? "" : "s"} configured` : "connecting…"}
          </span>
        </div>
        <button
          onClick={openSettings}
          className="flex w-full items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2 text-[12.5px] font-medium text-ink-soft shadow-card transition-colors hover:border-omp-300 hover:text-omp-700"
        >
          <Settings2 size={13} />
          Settings &amp; providers
          {providersConfigured === 0 && <Badge tone="amber" className="ml-auto">configure a provider</Badge>}
        </button>
      </div>
    </aside>
  );
}
