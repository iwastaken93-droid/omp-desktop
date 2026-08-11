import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useStudio } from "../../lib/store";
import { formatNumber } from "../../lib/format";
import { Badge } from "../ui";

export function ModelPicker({ align = "left" }: { align?: "left" | "center" | "right" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const models = useStudio((s) => s.models);
  const providers = useStudio((s) => s.providers);
  const detail = useStudio((s) => s.detail);
  const setModel = useStudio((s) => s.setModel);
  const busy = useStudio((s) => s.busy);

  const current = detail?.model;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = models.filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        providers.find((p) => p.id === m.provider)?.name.toLowerCase().includes(q),
    );
    const byProvider = new Map<string, typeof filtered>();
    for (const m of filtered) {
      const list = byProvider.get(m.provider) ?? [];
      list.push(m);
      byProvider.set(m.provider, list);
    }
    return [...byProvider.entries()].map(([pid, list]) => {
      const p = providers.find((x) => x.id === pid);
      const configured = list.some((m) => m.available);
      return {
        provider: pid,
        name: p?.name ?? pid,
        configured,
        oauth: p?.oauth ?? false,
        models: list.sort((a, b) => Number(b.available) - Number(a.available) || a.name.localeCompare(b.name)),
      };
    });
  }, [models, providers, query]);

  const currentLabel = current ?? "No model";

  return (
    <div className="relative">
      <button
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 text-[12.5px] font-medium text-ink transition-colors hover:border-omp-300 hover:text-omp-700 disabled:opacity-50"
      >
        <Sparkles size={12} className="text-omp-600" />
        <span className="max-w-[180px] truncate">{currentLabel}</span>
        <ChevronDown size={12} className="text-ink-faint" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className={`absolute z-40 mt-1.5 w-[380px] overflow-hidden rounded-2xl border border-line bg-surface shadow-pop ${
                align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
              }`}
            >
              <div className="border-b border-line p-2.5">
                <div className="flex items-center gap-2 rounded-lg border border-line-strong bg-dusk-50 px-2.5">
                  <Search size={13} className="text-ink-faint" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search models or providers…"
                    className="h-8 w-full bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
                  />
                </div>
              </div>
              <div className="max-h-[380px] overflow-y-auto p-1.5">
                {groups.length === 0 && (
                  <div className="px-3 py-6 text-center text-[12.5px] text-ink-faint">No models match “{query}”.</div>
                )}
                {groups.map((g) => (
                  <div key={g.provider} className="mb-1">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{g.name}</span>
                      {g.configured ? <Badge tone="green">key set</Badge> : g.oauth ? <Badge tone="blue">oauth</Badge> : null}
                    </div>
                    {g.models.slice(0, 12).map((m) => {
                      const selected = current === m.id || current === `${g.provider}/${m.id}`;
                      return (
                        <button
                          key={m.id}
                          disabled={busy}
                          onClick={() => {
                            void setModel(m.id);
                            setOpen(false);
                          }}
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                            selected ? "bg-omp-50" : "hover:bg-dusk-50"
                          }`}
                        >
                          <span className={`min-w-0 flex-1 truncate text-[12.5px] font-medium ${selected ? "text-omp-900" : "text-ink"}`}>
                            {m.name}
                          </span>
                          <span className="shrink-0 font-mono text-[10.5px] text-ink-faint">
                            {m.contextWindow ? `${formatNumber(m.contextWindow)} ctx` : ""}
                          </span>
                          {selected && <Check size={13} className="shrink-0 text-omp-600" />}
                        </button>
                      );
                    })}
                    {g.models.length > 12 && (
                      <div className="px-2.5 pb-1 pt-0.5 text-[10.5px] text-ink-faint">+ {g.models.length - 12} more models</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-line bg-dusk-50/60 px-3 py-2 text-[11px] text-ink-faint">
                Models are per-session · “key set” = the provider has credentials in this workspace
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
