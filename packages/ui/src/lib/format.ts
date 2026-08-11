export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatNumber(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function formatCost(n: number | string | undefined): string {
  if (n === undefined || n === null) return "—";
  const v = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(v)) return "—";
  if (v === 0) return "$0.00";
  return `$${v.toFixed(v < 0.01 ? 4 : 2)}`;
}

export function formatMs(ms: number | undefined): string {
  if (ms === undefined) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Display a model id nicely: "anthropic/claude-sonnet-4-5" -> "Anthropic · Claude Sonnet 4.5". */
export function modelLabel(model: string | undefined, models?: { id: string; provider: string; name: string }[]): string {
  if (!model) return "No model";
  const byId = models?.find((m) => m.id === model);
  if (byId) return `${byId.name}`;
  if (model.includes("/")) {
    const [provider, id] = model.split("/");
    const match = models?.find((m) => m.id === id && m.provider === provider);
    if (match) return match.name;
    return `${provider}/${id}`;
  }
  return model;
}

export function providerLabel(id: string | undefined, providers?: { id: string; name: string }[]): string {
  if (!id) return "";
  return providers?.find((p) => p.id === id)?.name ?? id;
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
