import { FileDiff, FilePlus2, FileMinus2 } from "lucide-react";
import { useState } from "react";
import type { DiffFile } from "@omp/shared";

export function DiffViewer({ diff }: { diff: DiffFile }) {
  const [collapsed, setCollapsed] = useState(false);
  const added = diff.hunks.reduce((n, h) => n + h.lines.filter((l) => l.startsWith("+")).length, 0);
  const removed = diff.hunks.reduce((n, h) => n + h.lines.filter((l) => l.startsWith("-")).length, 0);

  const Icon = diff.status === "added" ? FilePlus2 : diff.status === "deleted" ? FileMinus2 : FileDiff;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <button onClick={() => setCollapsed((v) => !v)} className="flex w-full items-center gap-2 border-b border-line bg-dusk-50/60 px-3 py-2 text-left">
        <Icon size={13} className={diff.status === "added" ? "text-omp-600" : diff.status === "deleted" ? "text-red-500" : "text-ink-faint"} />
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] font-medium text-ink">{diff.path}</span>
        <span className="shrink-0 font-mono text-[11px]">
          <span className="text-omp-700">+{added}</span>
          <span className="text-red-600"> -{removed}</span>
        </span>
      </button>
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[11.5px] leading-[1.55]">
            <tbody>
              {diff.hunks.map((h, hi) =>
                h.lines.map((line, li) => {
                  const type = line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : "ctx";
                  return (
                    <tr
                      key={`${hi}-${li}`}
                      className={
                        type === "add"
                          ? "bg-omp-50/70"
                          : type === "del"
                            ? "bg-red-50/70"
                            : "bg-surface"
                      }
                    >
                      <td className="w-8 select-none border-r border-line px-2 text-right text-[10px] text-ink-faint">
                        {type === "add" ? "" : "·"}
                      </td>
                      <td className="w-8 select-none border-r border-line px-2 text-right text-[10px] text-ink-faint">
                        {type === "del" ? "" : "·"}
                      </td>
                      <td className={`whitespace-pre px-3 ${type === "add" ? "text-omp-800" : type === "del" ? "text-red-700" : "text-ink-soft"}`}>
                        {line === "" ? " " : line}
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
