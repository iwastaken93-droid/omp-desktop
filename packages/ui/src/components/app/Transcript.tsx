import { useEffect, useRef } from "react";
import { useStudio } from "../../lib/store";
import { MessageBubble } from "./MessageBubble";

export function Transcript() {
  const detail = useStudio((s) => s.detail);
  const busy = useStudio((s) => s.busy);
  const branchFrom = useStudio((s) => s.branchFrom);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [detail?.messages.length, detail?.messages.map((m) => m.content.length + (m.thinking?.length ?? 0)).join(",")]);

  const messages = detail?.messages ?? [];

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {messages.length === 0 && (
          <div className="flex h-full min-h-[50vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-xl font-bold text-white">⌥</div>
              <h2 className="mt-4 text-lg font-semibold tracking-tight">Start a session</h2>
              <p className="mt-1 max-w-xs text-[13.5px] leading-relaxed text-ink-soft">
                Ask the agent to explore this repo, plan a change, or spin up subagents.
              </p>
            </div>
          </div>
        )}
        <div className="space-y-6">
          {messages.map((m, i) => (
            <MessageBubble key={m.id} message={m} isLast={i === messages.length - 1} onBranch={(entryId) => void branchFrom(entryId)} />
          ))}
          {busy && messages.length > 0 && (
            <div className="flex items-center gap-2 pl-10 text-[12px] text-ink-faint">
              <span className="flex gap-0.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-omp-500" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-omp-500" style={{ animationDelay: "120ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-omp-500" style={{ animationDelay: "240ms" }} />
              </span>
              agent working
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
