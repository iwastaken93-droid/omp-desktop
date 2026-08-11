import type { ModelInfo, ProviderInfo } from "@omp/shared";

// Curated human names + env var conventions for the omp provider catalog.
// Anything not listed falls back to a readable slug + `<ID>_API_KEY`.
const PROVIDER_META: Record<string, { name: string; envVar?: string; category: ProviderInfo["category"]; oauth?: boolean }> = {
  anthropic: { name: "Anthropic", envVar: "ANTHROPIC_API_KEY", category: "frontier" },
  openai: { name: "OpenAI", envVar: "OPENAI_API_KEY", category: "frontier" },
  "openai-codex": { name: "OpenAI Codex", envVar: "OPENAI_API_KEY", category: "coding-plan", oauth: true },
  google: { name: "Google Gemini", envVar: "GEMINI_API_KEY", category: "frontier" },
  "google-gemini-cli": { name: "Gemini CLI", envVar: "GEMINI_API_KEY", category: "frontier", oauth: true },
  "google-vertex": { name: "Google Vertex", envVar: "GOOGLE_CLOUD_PROJECT", category: "frontier" },
  "google-antigravity": { name: "Google Antigravity", category: "coding-plan", oauth: true },
  xai: { name: "xAI", envVar: "XAI_API_KEY", category: "frontier" },
  "xai-oauth": { name: "SuperGrok", category: "coding-plan", oauth: true },
  deepseek: { name: "DeepSeek", envVar: "DEEPSEEK_API_KEY", category: "frontier" },
  mistral: { name: "Mistral", envVar: "MISTRAL_API_KEY", category: "frontier" },
  groq: { name: "Groq", envVar: "GROQ_API_KEY", category: "frontier" },
  cerebras: { name: "Cerebras", envVar: "CEREBRAS_API_KEY", category: "frontier" },
  fireworks: { name: "Fireworks", envVar: "FIREWORKS_API_KEY", category: "frontier" },
  together: { name: "Together", envVar: "TOGETHER_API_KEY", category: "frontier" },
  baseten: { name: "Baseten", envVar: "BASETEN_API_KEY", category: "frontier" },
  huggingface: { name: "Hugging Face", envVar: "HUGGING_FACE_API_KEY", category: "frontier" },
  nvidia: { name: "NVIDIA", envVar: "NVIDIA_API_KEY", category: "frontier" },
  "amazon-bedrock": { name: "Amazon Bedrock", envVar: "AWS_ACCESS_KEY_ID", category: "frontier" },
  azure: { name: "Azure OpenAI", envVar: "AZURE_OPENAI_API_KEY", category: "frontier" },
  "cloudflare-ai-gateway": { name: "Cloudflare AI Gateway", envVar: "CLOUDFLARE_API_TOKEN", category: "frontier" },
  "vercel-ai-gateway": { name: "Vercel AI Gateway", envVar: "VERCEL_AI_GATEWAY_TOKEN", category: "frontier" },
  "wafer-serverless": { name: "Wafer Serverless", envVar: "WAFER_API_KEY", category: "frontier" },
  openrouter: { name: "OpenRouter", envVar: "OPENROUTER_API_KEY", category: "frontier" },
  siliconflow: { name: "SiliconFlow", envVar: "SILICONFLOW_API_KEY", category: "frontier" },
  "gmi-cloud": { name: "GMI Cloud", envVar: "GMI_API_KEY", category: "frontier" },
  coreweave: { name: "CoreWeave", envVar: "COREWEAVE_API_KEY", category: "frontier" },
  sakana: { name: "Sakana AI", envVar: "SAKANA_API_KEY", category: "frontier" },
  synthetic: { name: "Synthetic", envVar: "SYNTHETIC_API_KEY", category: "frontier" },
  "meta": { name: "Meta", envVar: "META_API_KEY", category: "frontier" },
  cursor: { name: "Cursor", category: "coding-plan", oauth: true },
  "github-copilot": { name: "GitHub Copilot", category: "coding-plan", oauth: true },
  "gitlab-duo": { name: "GitLab Duo", category: "coding-plan" },
  "gitlab-duo-agent": { name: "GitLab Duo Agent", category: "coding-plan" },
  devin: { name: "Devin", category: "coding-plan", oauth: true },
  "kimi-code": { name: "Kimi Code", category: "coding-plan" },
  moonshot: { name: "Moonshot", envVar: "MOONSHOT_API_KEY", category: "coding-plan" },
  "minimax": { name: "MiniMax", envVar: "MINIMAX_API_KEY", category: "frontier" },
  "minimax-cn": { name: "MiniMax CN", envVar: "MINIMAX_API_KEY", category: "frontier" },
  "minimax-code": { name: "MiniMax Coding Plan", category: "coding-plan" },
  "minimax-code-cn": { name: "MiniMax Coding Plan CN", category: "coding-plan" },
  "alibaba-coding-plan": { name: "Alibaba Coding Plan", category: "coding-plan" },
  "alibaba-token-plan": { name: "Alibaba Token Plan", category: "coding-plan" },
  "qwen-portal": { name: "Qwen Portal", category: "coding-plan", oauth: true },
  zai: { name: "Z.AI / GLM", envVar: "ZAI_API_KEY", category: "coding-plan" },
  "zhipu-coding-plan": { name: "Zhipu Coding Plan", category: "coding-plan" },
  "xiaomi": { name: "Xiaomi MiMo", category: "coding-plan" },
  "xiaomi-token-plan-ams": { name: "Xiaomi Token Plan (AMS)", category: "coding-plan" },
  "xiaomi-token-plan-cn": { name: "Xiaomi Token Plan (CN)", category: "coding-plan" },
  "xiaomi-token-plan-sgp": { name: "Xiaomi Token Plan (SGP)", category: "coding-plan" },
  qianfan: { name: "Baidu Qianfan", category: "coding-plan" },
  umans: { name: "Umans", category: "coding-plan" },
  nanogpt: { name: "NanoGPT", envVar: "NANOGPT_API_KEY", category: "coding-plan" },
  novita: { name: "Novita", envVar: "NOVITA_API_KEY", category: "coding-plan" },
  venice: { name: "Venice", envVar: "VENICE_API_KEY", category: "coding-plan" },
  kilo: { name: "Kilo", envVar: "KILO_API_KEY", category: "coding-plan" },
  zenmux: { name: "ZenMux", envVar: "ZENMUX_API_KEY", category: "coding-plan" },
  "opencode": { name: "OpenCode", category: "coding-plan" },
  "opencode-go": { name: "OpenCode Go", category: "coding-plan" },
  "opencode-zen": { name: "OpenCode Zen", category: "coding-plan" },
  ollama: { name: "Ollama", category: "local" },
  "ollama-cloud": { name: "Ollama Cloud", envVar: "OLLAMA_API_KEY", category: "local" },
  "lm-studio": { name: "LM Studio", category: "local" },
  "llama-cpp": { name: "llama.cpp", category: "local" },
  vllm: { name: "vLLM", category: "local" },
  litellm: { name: "LiteLLM", envVar: "LITELLM_API_KEY", category: "local" },
  aiand: { name: "AI&", category: "frontier" },
  aimlapi: { name: "AIML API", envVar: "AIMLAPI_API_KEY", category: "frontier" },
  "bedrock-mantle": { name: "Bedrock Mantle", category: "frontier" },
  firepass: { name: "Firepass", category: "frontier" },
};

function slugToName(id: string): string {
  if (PROVIDER_META[id]) return PROVIDER_META[id].name;
  return id
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function slugToEnvVar(id: string): string {
  if (PROVIDER_META[id]?.envVar) return PROVIDER_META[id].envVar!;
  return `${id.toUpperCase().replace(/[-.]/g, "_")}_API_KEY`;
}

function slugToCategory(id: string): ProviderInfo["category"] {
  if (PROVIDER_META[id]?.category) return PROVIDER_META[id].category;
  if (["ollama", "lm-studio", "llama-cpp", "vllm", "litellm"].includes(id)) return "local";
  return "frontier";
}

export interface CatalogEntry {
  providers: ProviderInfo[];
  models: ModelInfo[];
}

const STATIC_MODELS: ModelRef[] = [
  // Anthropic
  { id: "claude-opus-4-5", provider: "anthropic", model: "claude-opus-4-5", name: "Claude Opus 4.5", contextWindow: 200000, maxTokens: 64000 },
  { id: "claude-sonnet-4-5", provider: "anthropic", model: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", contextWindow: 200000, maxTokens: 64000 },
  { id: "claude-haiku-4-5", provider: "anthropic", model: "claude-haiku-4-5", name: "Claude Haiku 4.5", contextWindow: 200000, maxTokens: 32000 },
  // OpenAI
  { id: "gpt-5.2", provider: "openai", model: "gpt-5.2", name: "GPT-5.2", contextWindow: 400000, maxTokens: 128000 },
  { id: "gpt-5.1-mini", provider: "openai", model: "gpt-5.1-mini", name: "GPT-5.1 mini", contextWindow: 400000, maxTokens: 128000 },
  { id: "gpt-4.1", provider: "openai", model: "gpt-4.1", name: "GPT-4.1", contextWindow: 1000000, maxTokens: 32768 },
  // Google
  { id: "gemini-3-pro", provider: "google", model: "gemini-3-pro", name: "Gemini 3 Pro", contextWindow: 1000000, maxTokens: 65536 },
  { id: "gemini-3-flash", provider: "google", model: "gemini-3-flash", name: "Gemini 3 Flash", contextWindow: 1000000, maxTokens: 65536 },
  { id: "gemini-2.5-pro", provider: "google", model: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1000000, maxTokens: 65536 },
  // xAI
  { id: "grok-4", provider: "xai", model: "grok-4", name: "Grok 4", contextWindow: 131072, maxTokens: 32768 },
  { id: "grok-4-fast", provider: "xai", model: "grok-4-fast", name: "Grok 4 Fast", contextWindow: 131072, maxTokens: 32768 },
  { id: "grok-code-fast-1", provider: "xai", model: "grok-code-fast-1", name: "Grok Code Fast 1", contextWindow: 262144, maxTokens: 32768 },
  // DeepSeek
  { id: "deepseek-v3.2", provider: "deepseek", model: "deepseek-v3.2", name: "DeepSeek V3.2", contextWindow: 131072, maxTokens: 8192 },
  { id: "deepseek-r1", provider: "deepseek", model: "deepseek-r1", name: "DeepSeek R1", contextWindow: 131072, maxTokens: 8192 },
  // Mistral
  { id: "mistral-large-3", provider: "mistral", model: "mistral-large-3", name: "Mistral Large 3", contextWindow: 128000, maxTokens: 8192 },
  { id: "mistral-small-3.2", provider: "mistral", model: "mistral-small-3.2", name: "Mistral Small 3.2", contextWindow: 128000, maxTokens: 8192 },
  // Groq
  { id: "llama-4-scout-17b", provider: "groq", model: "llama-4-scout-17b", name: "Llama 4 Scout", contextWindow: 1000000, maxTokens: 32768 },
  { id: "qwen-3-coder-480b", provider: "groq", model: "qwen-3-coder-480b", name: "Qwen 3 Coder 480B", contextWindow: 262144, maxTokens: 32768 },
  // OpenRouter
  { id: "openrouter/auto", provider: "openrouter", model: "auto", name: "OpenRouter Auto", contextWindow: 200000, maxTokens: 32768 },
  { id: "openrouter/deepseek/deepseek-v3.2", provider: "openrouter", model: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2 (OR)", contextWindow: 131072, maxTokens: 8192 },
  // Local
  { id: "qwen3-coder-30b", provider: "ollama", model: "qwen3-coder-30b", name: "Qwen3 Coder 30B (Ollama)", contextWindow: 131072, maxTokens: 16384 },
  { id: "llama-3.3-70b", provider: "ollama", model: "llama-3.3-70b", name: "Llama 3.3 70B (Ollama)", contextWindow: 131072, maxTokens: 8192 },
];

export interface ModelRef {
  id: string;
  provider: string;
  model: string;
  name: string;
  contextWindow?: number;
  maxTokens?: number;
  cost?: { input?: number; output?: number };
}

/**
 * Thin wrapper over the omp ModelRegistry so the rest of the worker never
 * depends on the SDK types directly.
 */
export class Catalog {
  private models: ModelRef[] = [];
  private availableIds = new Set<string>();
  private refreshPromise: Promise<void> | null = null;
  private failed = false;

  constructor(
    private loadModels: () => Promise<ModelRef[]>,
    private loadAvailable: () => Promise<string[]>,
  ) {}

  static async create(getRegistry: () => { getAll(): unknown[]; getAvailable(): unknown[] }): Promise<Catalog> {
    const catalog = new Catalog(
      async () => {
        const all = getRegistry().getAll() as any[];
        return all.map((m) => ({
          id: String(m.id ?? ""),
          provider: String(m.provider ?? ""),
          model: String(m.model ?? ""),
          name: String(m.name ?? m.model ?? m.id ?? ""),
          contextWindow: typeof m.contextWindow === "number" ? m.contextWindow : undefined,
          maxTokens: typeof m.maxTokens === "number" ? m.maxTokens : undefined,
          cost: m.cost && typeof m.cost === "object"
            ? { input: typeof m.cost.input === "number" ? m.cost.input : undefined, output: typeof m.cost.output === "number" ? m.cost.output : undefined }
            : undefined,
        }));
      },
      async () => {
        const avail = getRegistry().getAvailable() as any[];
        return avail.map((m) => String(m.id ?? ""));
      },
    );
    await catalog.refresh();
    return catalog;
  }

  async refresh(): Promise<void> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = (async () => {
      try {
        const [models, available] = await Promise.all([this.loadModels(), this.loadAvailable()]);
        this.models = models;
        this.availableIds = new Set(available);
        this.failed = false;
      } catch (err) {
        this.failed = true;
        console.error("[catalog] failed to load model catalog:", err);
      }
    })();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /** Static catalog used when the omp SDK cannot be loaded. */
  static static(): Catalog {
    const rows: ModelRef[] = STATIC_MODELS;
    const catalog = new Catalog(
      async () => rows,
      async () => [] as string[],
    );
    catalog.models = rows;
    return catalog;
  }

  get failedToLoad(): boolean {
    return this.failed;
  }

  get allModels(): ModelRef[] {
    return this.models;
  }

  isAvailable(modelId: string): boolean {
    return this.availableIds.has(modelId);
  }

  find(modelId: string): ModelRef | undefined {
    return this.models.find((m) => m.id === modelId);
  }

  snapshot(): CatalogEntry {
    const byProvider = new Map<string, ModelRef[]>();
    for (const m of this.models) {
      const list = byProvider.get(m.provider) ?? [];
      list.push(m);
      byProvider.set(m.provider, list);
    }
    const providers: ProviderInfo[] = [...byProvider.entries()]
      .map(([id, models]) => {
        const configured = models.some((m) => this.availableIds.has(m.id));
        return {
          id,
          name: slugToName(id),
          envVar: slugToEnvVar(id),
          configured,
          oauth: !!PROVIDER_META[id]?.oauth,
          category: slugToCategory(id),
          modelCount: models.length,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const models: ModelInfo[] = this.models
      .filter((m) => m.provider && m.id)
      .map((m) => ({
        id: m.id,
        provider: m.provider,
        name: m.name,
        contextWindow: m.contextWindow,
        maxTokens: m.maxTokens,
        available: this.availableIds.has(m.id),
        cost: m.cost,
      }))
      .sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

    return { providers, models };
  }
}
