import { ArrowUp, Sparkles, Square } from "lucide-react";
import { useRef, useState } from "react";
import { useStudio } from "../../lib/store";
import { Button } from "../ui";

export function Composer() {
  const [text, setText] = useState("");
  const sendPrompt = useStudio((s) => s.sendPrompt);
  const busy = useStudio((s) => s.busy);
  const abort = useStudio((s) => s.abort);
  const planMode = useStudio((s) => s.planMode);
  const connected = useStudio((s) => s.connected);
  const ref = useRef<HTMLTextAreaElement>(null);

  const ultrathink = /(^|\s)ultrathink(\s|$|!|\.)/i.test(text);

  const send = () => {
    const value = text.trim();
    if (!value || busy) return;
    setText("");
    if (ref.current) ref.current.style.height = "auto";
    void sendPrompt(value);
  };

  const autoGrow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  };

  return (
    <div className="shrink-0 border-t border-line bg-surface px-4 pb-3.5 pt-2.5">
      <div className="mx-auto max-w-3xl">
        <div className={`relative rounded-2xl border bg-canvas shadow-card transition-all ${ultrathink ? "rainbow-glow border-transparent" : "border-line-strong focus-within:border-omp-400 focus-within:ring-4 focus-within:ring-omp-500/10"}`}>
          <textarea
            ref={ref}
            value={text}
            rows={1}
            onChange={(e) => {
              setText(e.target.value);
              autoGrow();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={planMode ? "Describe the change to plan…" : "Ask the agent to do something…"}
            className="block w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[14.5px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
            style={{ maxHeight: 220 }}
          />
          <div className="flex items-center justify-between px-2.5 pb-2 pt-1">
            <div className="flex items-center gap-1.5 pl-1.5">
              {ultrathink ? (
                <span className="flex items-center gap-1.5 rounded-full border border-transparent px-2 py-0.5 text-[11px] font-semibold">
                  <Sparkles size={11} className="rainbow-text" />
                  <span className="rainbow-text">ultrathink armed</span>
                </span>
              ) : (
                <span className="text-[11px] text-ink-faint">
                  <kbd className="kbd mr-1">↵</kbd> send · <kbd className="kbd mr-1">⇧↵</kbd> newline
                </span>
              )}
              {planMode && !ultrathink && <span className="text-[11px] font-medium text-omp-700">plan mode</span>}
            </div>
            {busy ? (
              <Button size="icon" variant="danger" onClick={abort} title="Stop">
                <Square size={13} fill="currentColor" />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="primary"
                onClick={send}
                disabled={!text.trim() || !connected}
                title="Send"
                className={ultrathink ? "rainbow-avatar border-0 text-white" : ""}
              >
                <ArrowUp size={15} strokeWidth={2.4} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
