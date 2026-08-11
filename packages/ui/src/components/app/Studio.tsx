import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, PlugZap, WifiOff } from "lucide-react";
import { useEffect } from "react";
import { useStudio } from "../../lib/store";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Transcript } from "./Transcript";
import { Composer } from "./Composer";
import { RightPanel } from "./RightPanel";
import { SettingsModal } from "./SettingsModal";

export function Studio() {
  const init = useStudio((s) => s.init);
  const connected = useStudio((s) => s.connected);
  const busy = useStudio((s) => s.busy);
  const notices = useStudio((s) => s.notices);
  const engine = useStudio((s) => s.engine);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <div className="flex h-full overflow-hidden bg-canvas text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <Transcript />
        <Composer />
      </div>
      <RightPanel />

      {/* connection banner */}
      <AnimatePresence>
        {!connected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed inset-x-0 top-0 z-40 flex items-center justify-center gap-2 bg-amber-50 px-4 py-1.5 text-[12.5px] font-medium text-amber-800 border-b border-amber-200"
          >
            <WifiOff size={13} />
            Connecting to the local omp worker…
          </motion.div>
        )}
      </AnimatePresence>

      {/* demo banner */}
      {connected && engine === "demo" && (
        <div className="pointer-events-none fixed bottom-16 left-1/2 z-30 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-[11.5px] font-medium text-ink-soft shadow-pop">
            <PlugZap size={12} className="text-omp-600" />
            Demo agent running — add a provider key in Settings for the real omp engine
          </div>
        </div>
      )}

      {/* notices */}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
        <AnimatePresence>
          {notices.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] shadow-pop backdrop-blur ${
                n.kind === "error"
                  ? "border-red-200 bg-red-50/95 text-red-800"
                  : n.kind === "warn"
                    ? "border-amber-200 bg-amber-50/95 text-amber-800"
                    : "border-line bg-surface/95 text-ink"
              }`}
            >
              {n.kind === "error" ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-omp-500" />}
              <span className="leading-snug">{n.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <SettingsModal />
      {busy && <div className="sr-only" aria-live="polite">agent is working</div>}
    </div>
  );
}
