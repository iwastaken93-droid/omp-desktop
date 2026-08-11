import { CheckCircle2, ChevronDown, ChevronRight, ExternalLink, KeyRound, PlugZap, Search, Settings2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AppSettings, ProviderInfo } from "@omp/shared";
import { rpc } from "../../lib/rpc";
import { useStudio } from "../../lib/store";
import { formatNumber } from "../../lib/format";
import { Badge, Button, Modal, Segmented } from "../ui";

type Tab = "providers" | "models" | "roles" | "engine" | "settings";

const CATEGORIES: { key: ProviderInfo["category"]; label: string }[] = [
  { key: "frontier", label: "Frontier APIs" },
  { key: "coding-plan", label: "Coding plans" },
  { key: "local", label: "Run it yourself" },
  { key: "custom", label: "Custom" },
];

function ProviderCard({ provider, onSaved }: { provider: ProviderInfo; onSaved: (msg: string) => void }) {
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const save = async () => {
    if (!key.trim()) return;
    setSaving(true);
    try {
      const res = await rpc.call<{ accepted: boolean; providersConfigured?: number; catalog?: { providers?: ProviderInfo[]; models?: unknown[]; roles?: unknown[]; thinking?: unknown[] } }>("setApiKey", { provider: provider.id, key: key.trim() });
      if (res.catalog) {
        useStudio.setState((state) => ({
          providers: (res.catalog?.providers as ProviderInfo[] | undefined) ?? state.providers,
          models: (res.catalog?.models as typeof state.models | undefined) ?? state.models,
          providersConfigured: res.providersConfigured ?? state.providersConfigured,
          engine: res.accepted ? "omp" : state.engine,
        }));
      }
      onSaved(res.accepted ? `Key stored for ${provider.name}; available models are now filtered to this credential.` : "The live engine is unavailable right now.");
      setKey("");
    } catch (e) {
      onSaved(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const login = async () => {
    setLoggingIn(true);
    try {
      await rpc.call("loginProvider", { provider: provider.id });
      onSaved(`Opening ${provider.name} sign-in…`);
    } catch (e) {
      onSaved(e instanceof Error ? e.message : String(e));
    } finally {
      setLoggingIn(false);
    }
  };

  const supportsApiKey = provider.authMethods?.includes("api-key") ?? !provider.oauth;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-dusk-100 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
        {provider.name.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold">{provider.name}</span>
          {provider.configured ? (
            <Badge tone="green">
              <CheckCircle2 size={10} /> configured
            </Badge>
          ) : provider.oauth ? (
            <Badge tone="blue">oauth</Badge>
          ) : (
            <Badge tone="neutral">no key</Badge>
          )}
        </div>
        <div className="mt-0.5 text-[11.5px] text-ink-faint">
          {provider.modelCount} models · env <code className="rounded bg-dusk-100 px-1 py-px font-mono text-[10px]">{provider.envVar}</code>
          {provider.oauth && " · sign in with your provider account"}
        </div>
        {provider.oauth && (
          <div className="mt-2 flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => void login()} disabled={loggingIn}>
              <ExternalLink size={12} /> {loggingIn ? "Starting…" : provider.configured ? "Reconnect" : "Sign in"}
            </Button>
            <span className="text-[11px] text-ink-faint">Uses omp’s native OAuth flow</span>
          </div>
        )}
        {supportsApiKey && (
          <div className="mt-2 flex items-center gap-1.5">
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void save()}
              placeholder={`Paste ${provider.envVar}`}
              className="h-8 min-w-0 flex-1 rounded-lg border border-line-strong bg-canvas px-2.5 font-mono text-[12px] outline-none transition-colors placeholder:text-ink-faint focus:border-omp-400 focus:ring-2 focus:ring-omp-500/10"
            />
            <Button size="sm" onClick={() => void save()} disabled={!key.trim() || saving}>
              {saving ? "…" : "Save"}
            </Button>
          </div>
        )}
        <div className="mt-1.5 text-[10.5px] text-ink-faint">
          Tip: keys set in the workspace <span className="font-medium text-ink-soft">API Keys</span> tab (as env vars) are picked up automatically.
        </div>
      </div>
    </div>
  );
}

function ProvidersTab({ onSaved }: { onSaved: (msg: string) => void }) {
  const providers = useStudio((s) => s.providers);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<"all" | ProviderInfo["category"]>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter(
      (p) =>
        (cat === "all" || p.category === cat) &&
        (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)),
    );
  }, [providers, query, cat]);

  const configured = providers.filter((p) => p.configured).length;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-line-strong bg-canvas px-2.5">
          <Search size={13} className="text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search providers…"
            className="h-9 w-full bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
          />
        </div>
        <Segmented
          size="sm"
          value={cat}
          onChange={(v) => setCat(v)}
          options={[
            { value: "all", label: "All" },
            { value: "frontier", label: "APIs" },
            { value: "coding-plan", label: "Plans" },
            { value: "local", label: "Local" },
          ]}
        />
      </div>
      <div className="mb-2 text-[11.5px] text-ink-soft">
        {configured > 0 ? (
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-omp-600" />
            {configured} provider{configured === 1 ? "" : "s"} with credentials detected
          </span>
        ) : (            <span>No provider credentials detected — configure a provider to create a real omp session.</span>
        )}
      </div>
      <div className="grid gap-2.5 lg:grid-cols-2">
        {filtered.map((p) => (
          <ProviderCard key={p.id} provider={p} onSaved={onSaved} />
        ))}
        {filtered.length === 0 && <div className="col-span-full py-8 text-center text-[13px] text-ink-faint">No providers match.</div>}
      </div>
    </div>
  );
}

function ModelsTab() {
  const models = useStudio((s) => s.models);
  const providers = useStudio((s) => s.providers);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<string>("all");
  const [limit, setLimit] = useState(60);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models
      .filter(
        (m) =>
          (provider === "all" || m.provider === provider) &&
          (!q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.provider.includes(q)),
      )
      .slice(0, limit);
  }, [models, provider, query, limit]);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-line-strong bg-canvas px-2.5">
          <Search size={13} className="text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search models…"
            className="h-9 w-full bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
          />
        </div>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-[12.5px] outline-none"
        >
          <option value="all">All providers</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="mb-2 text-[11.5px] text-ink-soft">{models.length.toLocaleString()} models in the catalog</div>
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-line bg-dusk-50 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
              <th className="px-3 py-2">Model</th>
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2 text-right">Context</th>
              <th className="px-3 py-2 text-right">Max out</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-line last:border-0 hover:bg-dusk-50/60">
                <td className="px-3 py-1.5 font-medium text-ink">
                  {m.name}
                  {m.available && <span className="ml-1.5 rounded bg-omp-50 px-1 py-px text-[9.5px] font-semibold text-omp-700">key</span>}
                </td>
                <td className="px-3 py-1.5 font-mono text-[11px] text-ink-soft">{providers.find((p) => p.id === m.provider)?.name ?? m.provider}</td>
                <td className="px-3 py-1.5 text-right font-mono text-[11px] text-ink-soft">{m.contextWindow ? formatNumber(m.contextWindow) : "—"}</td>
                <td className="px-3 py-1.5 text-right font-mono text-[11px] text-ink-soft">{m.maxTokens ? formatNumber(m.maxTokens) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length >= limit && (
        <div className="mt-3 text-center">
          <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + 100)}>
            Show more
          </Button>
        </div>
      )}
    </div>
  );
}

function RolesTab() {
  const roles = useStudio((s) => s.roles);
  const models = useStudio((s) => s.models);
  return (
    <div className="p-4">
      <div className="mb-3 rounded-xl border border-line bg-dusk-50/70 p-3.5 text-[12px] leading-relaxed text-ink-soft">
        omp roles are model aliases used for specialized work. Their assignments come from the same settings model as the terminal app; only configured models appear here.
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {roles.map((role) => (
          <div key={role.id} className="rounded-xl border border-line bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[13px]">{role.name}</span>
              <Badge tone="neutral">@{role.id}</Badge>
            </div>
            <p className="mt-1 text-[11.5px] text-ink-soft">{role.description}</p>
            <div className="mt-2 truncate font-mono text-[10.5px] text-ink-faint">
              {role.configuredModel ?? models.find((model) => model.id === role.configuredModel)?.name ?? "not assigned"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OmpSettingsTab() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void rpc.call<AppSettings>("getSettings").then(setSettings).finally(() => setLoading(false));
  }, []);

  if (loading || !settings) return <div className="p-6 text-[13px] text-ink-faint">Loading omp settings…</div>;
  const rows = [
    ["Theme", settings.theme ?? "light"],
    ["Editor", settings.editor ?? "system"],
    ["Transport", settings.transport ?? "local Bun worker"],
    ["Compaction", settings.compaction ? "enabled" : "disabled"],
    ["Context window", settings.contextWindow ? formatNumber(settings.contextWindow) : "model default"],
    ["Model cycle", settings.cycleOrder?.join(" → ") ?? "smol → default → slow"],
    ["Memory", settings.memoryBackend ?? "off"],
  ];
  return (
    <div className="p-4">
      <div className="mb-3 rounded-xl border border-line bg-dusk-50/70 p-3.5 text-[12px] leading-relaxed text-ink-soft">
        These are the omp settings that shape model selection, context handling, memory, and interaction behavior. They mirror the terminal app’s configuration vocabulary instead of a separate wrapper-only system.
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-surface p-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{label}</div>
            <div className="mt-1 truncate font-mono text-[12px] text-ink">{value}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Safety & interaction</div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11.5px] text-ink-soft">
          <Badge tone={settings.autoTitle ? "green" : "neutral"}>auto title {settings.autoTitle ? "on" : "off"}</Badge>
          <Badge tone={settings.confirmDestructiveTools ? "green" : "amber"}>confirm destructive tools</Badge>
          <Badge tone={settings.showToolArguments ? "green" : "neutral"}>show tool arguments</Badge>
          <Badge tone={settings.streamRules ? "green" : "neutral"}>stream rules</Badge>
        </div>
      </div>
    </div>
  );
}

function OAuthPanel() {
  const flow = useStudio((s) => s.oauthFlow);
  const [input, setInput] = useState("");
  if (!flow) return null;
  const submit = async () => {
    if (!input.trim()) return;
    await rpc.call("submitOAuthInput", { provider: flow.provider, input: input.trim() });
    setInput("");
  };
  return (
    <div className="mx-4 mt-4 rounded-xl border border-omp-200 bg-omp-50/60 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold text-omp-950">Connect {flow.name}</div>
          <div className="mt-1 text-[11.5px] leading-relaxed text-omp-900/70">{flow.progress ?? flow.instructions ?? "Continue in the provider window, then return here if a code is requested."}</div>
        </div>
        <a className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-omp-600 px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-omp-700" href={flow.launchUrl ?? flow.url} target="_blank" rel="noreferrer">
          <ExternalLink size={12} /> Open sign-in
        </a>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void submit()} placeholder="Paste code or redirect URL if asked" className="h-8 min-w-0 flex-1 rounded-lg border border-omp-200 bg-white px-2.5 text-[12px] outline-none" />
        <Button size="sm" onClick={() => void submit()} disabled={!input.trim()}>Submit</Button>
      </div>
    </div>
  );
}

function EngineTab() {
  const engine = useStudio((s) => s.engine);
  const providersConfigured = useStudio((s) => s.providersConfigured);
  const connected = useStudio((s) => s.connected);
  const engineHint = useStudio((s) => s.engineHint);

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center gap-2.5">
          <PlugZap size={16} className="text-omp-600" />
          <span className="text-[14px] font-semibold">Engine status</span>
          <Badge tone={connected ? (engine === "omp" ? "green" : "amber") : "neutral"} className="ml-auto">
            {connected ? (providersConfigured > 0 ? "live · omp SDK" : "ready · awaiting provider") : "disconnected"}
          </Badge>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{engineHint}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-dusk-50 p-2.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">providers with keys</div>
            <div className="mt-0.5 font-mono text-[15px] font-semibold">{providersConfigured}</div>
          </div>
          <div className="rounded-lg bg-dusk-50 p-2.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">runtime</div>
            <div className="mt-0.5 font-mono text-[15px] font-semibold">Bun worker</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          <KeyRound size={15} className="text-omp-600" />
          <span className="text-[14px] font-semibold">Credentials</span>
        </div>
        <ul className="mt-2.5 space-y-2 text-[13px] leading-relaxed text-ink-soft">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-omp-600" />
            <span>Keys from the workspace <span className="font-medium text-ink">API Keys</span> tab are injected as env vars (e.g. <code className="rounded bg-dusk-100 px-1 py-px font-mono text-[11px]">ANTHROPIC_API_KEY</code>) and picked up by the worker automatically.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-omp-600" />
            <span>Keys pasted here are persisted by the desktop worker in its app config so they survive restarts; the web preview keeps them in the worker’s runtime key store.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-omp-600" />
            <span>OAuth providers (Cursor, Copilot, Codex…) sign in through your provider account — configure those in the <span className="font-medium text-ink">Providers</span> tab.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export function SettingsModal() {
  const open = useStudio((s) => s.settingsOpen);
  const closeSettings = useStudio((s) => s.closeSettings);
  const [tab, setTab] = useState<Tab>("providers");

  const onSaved = (msg: string) => {
    const s = useStudio.getState();
    const notice = { id: `sn${Date.now()}`, message: msg, kind: "info" as const };
    s.dismissNotice;
    useStudio.setState((st) => ({ notices: [...st.notices, notice] }));
    setTimeout(() => useStudio.getState().dismissNotice(notice.id), 5200);
  };

  return (
    <Modal open={open} onClose={closeSettings} title={<span className="flex items-center gap-2"><Settings2 size={15} /> Settings</span>} width="max-w-4xl">
      <OAuthPanel />
      <div className="flex gap-1 border-b border-line bg-dusk-50/60 px-3 pt-2">
        {(
          [
            { key: "providers", label: "Providers", icon: PlugZap },
            { key: "models", label: "Models", icon: ChevronDown },
            { key: "roles", label: "Roles", icon: SlidersHorizontal },
            { key: "engine", label: "Engine", icon: Settings2 },
            { key: "settings", label: "omp", icon: SlidersHorizontal },
          ] as { key: Tab; label: string; icon: typeof PlugZap }[]
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-[12.5px] font-medium transition-colors ${
              tab === key ? "border-omp-600 text-omp-700" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>
      {tab === "providers" && <ProvidersTab onSaved={onSaved} />}
      {tab === "models" && <ModelsTab />}
      {tab === "roles" && <RolesTab />}
      {tab === "engine" && <EngineTab />}
      {tab === "settings" && <OmpSettingsTab />}
    </Modal>
  );
}
