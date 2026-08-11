import { AnimatePresence, motion } from "framer-motion";
import { Brain, GitBranch, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ChatMessage } from "@omp/shared";
import { Markdown } from "../../lib/markdown";
import { Button } from "../ui";
import { ToolCard } from "./ToolCard";

export function MessageBubble({ message, onBranch, isLast }: { message: ChatMessage; onBranch: (id: string) => void; isLast: boolean }) {
  const [showThinking, setShowThinking] = useState(false);

  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="flex justify-end"
      >
        <div className={`max-w-[85%] sm:max-w-[75%] ${message.rainbow ? "rainbow-glow" : ""}`}>
          <div
            className={`rounded-2xl rounded-br-md px-4 py-2.5 text-[14.5px] leading-relaxed shadow-card ${
              message.rainbow ? "bg-ink text-white" : "bg-ink text-white"
            }`}
          >
            {message.rainbow && <span className="rainbow-text font-semibold">ultrathink</span>}
            <span className={message.rainbow ? "ml-0.5" : ""}>{message.content.replace(/(^|\s)ultrathink(\s|$|!|\.)/i, "$1$2")}</span>
          </div>
          {message.rainbow && (
            <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[11px] font-medium text-ink-faint">
              <Sparkles size={11} className="text-omp-600" />
              <span className="rainbow-text font-semibold">maximum thinking effort</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  const tools = message.toolCalls ?? [];
  const hasThinking = !!message.thinking;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="group flex gap-3"
    >
      <div className="mt-0.5 flex shrink-0 flex-col items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-[13px] font-bold text-white shadow-card ${isLast && message.streaming ? "rainbow-avatar" : "bg-ink"}`}>
          ⌥
        </div>
        {isLast && (
          <button
            onClick={() => onBranch(message.id)}
            title="Branch from here"
            className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faint opacity-0 transition-all hover:bg-omp-50 hover:text-omp-700 group-hover:opacity-100"
          >
            <GitBranch size={12} />
          </button>
        )}
      </div>

      <div className="min-w-0 max-w-full flex-1 space-y-2.5 pt-0.5">
        {hasThinking && (
          <div className="overflow-hidden rounded-xl border border-line bg-dusk-50/70">
            <button
              onClick={() => setShowThinking((v) => !v)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
            >
              <Brain size={13} className={message.streaming ? "animate-pulse text-violet-600" : "text-ink-faint"} />
              <span className="text-[12px] font-medium text-ink-soft">
                {message.streaming ? "Thinking…" : "Thought"}
              </span>
              <span className="ml-auto text-[10.5px] text-ink-faint">{showThinking ? "hide" : "show"}</span>
            </button>
            <AnimatePresence>
              {showThinking && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="border-t border-line px-3 py-2 text-[12.5px] italic leading-relaxed text-ink-soft">
                    {message.thinking}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {tools.length > 0 && (
          <div className="space-y-1.5">
            {tools.map((t) => (
              <ToolCard key={t.id} tool={t} />
            ))}
          </div>
        )}

        <div className={message.streaming ? "typing-caret" : ""}>
          {message.content ? (
            <Markdown content={message.content} />
          ) : message.streaming ? (
            <span className="text-[14px] text-ink-faint">Working…</span>
          ) : null}
        </div>

        {!message.content && !message.streaming && tools.length === 0 && !hasThinking && (
          <div className="text-[13px] text-ink-faint">—</div>
        )}
      </div>
    </motion.div>
  );
}
