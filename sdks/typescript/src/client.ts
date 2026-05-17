/**
 * Synchronous-style client for the Heimdall v1 API.
 *
 * Uses the global `fetch` (Node 18+, every modern browser). Inject a custom
 * `fetch` via `HeimdallOptions.fetch` for tests.
 */
import {
  AuthenticationError,
  HeimdallError,
  InvalidPayloadError,
  NetworkError,
  NotFoundError,
} from "./errors";
import type {
  Agent,
  ChainDetail,
  ChainStatus,
  ChainSummary,
  DelegationResult,
  IncidentReport,
  WhoAmI,
} from "./types";

export interface HeimdallOptions {
  /** An `hd_live_*` or `hd_test_*` key from your Heimdall install. */
  apiKey: string;
  /** Where Heimdall is served. Default: http://localhost:8000 */
  baseUrl?: string;
  /** HTTP timeout in milliseconds. Default: 30000 */
  timeoutMs?: number;
  /** Override fetch (useful for tests / non-global runtimes). */
  fetch?: typeof fetch;
}

export interface DelegateInput {
  from_agent: string;
  to_agent: string;
  action: string;
  capabilities: string[];
  parent_credential?: string;
  declared_intent?: string;
  detected_intent?: string;
  value_limit?: number;
  context?: Record<string, unknown>;
}

export interface RegisterAgentInput {
  id: string;
  display_name: string;
  role: string;
  scope?: string[];
  owner?: string;
  tenant_id?: string;
}

export interface ListChainsOptions {
  status?: ChainStatus;
  limit?: number;
}

const DEFAULT_BASE_URL = "http://localhost:8000";
const DEFAULT_TIMEOUT_MS = 30_000;

export class Heimdall {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly _fetch: typeof fetch;

  constructor(opts: HeimdallOptions) {
    if (!opts.apiKey) {
      throw new Error("apiKey is required");
    }
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (opts.fetch) {
      this._fetch = opts.fetch;
    } else if (typeof fetch !== "undefined") {
      // Bind so `fetch` works inside browsers that require receiver === window.
      this._fetch = fetch.bind(globalThis);
    } else {
      throw new Error(
        "No global fetch available. Pass `fetch` in HeimdallOptions or use Node 18+.",
      );
    }
  }

  // -------------------------------------------------------------- delegate

  /** Authorise one hop. Pass `parent_credential` from the previous call on subsequent hops. */
  async delegate(input: DelegateInput): Promise<DelegationResult> {
    return this.request<DelegationResult>("POST", "/api/v1/delegate", input);
  }

  // ------------------------------------------------------------ registry

  /** Register or upsert an agent. */
  async registerAgent(
    input: RegisterAgentInput,
  ): Promise<{ id: string; status: "registered" | "updated" }> {
    return this.request("POST", "/api/v1/agents", input);
  }

  async listAgents(): Promise<Agent[]> {
    const r = await this.request<{ agents: Agent[] }>("GET", "/api/v1/agents");
    return r.agents;
  }

  // -------------------------------------------------------------- chains

  async listChains(opts: ListChainsOptions = {}): Promise<ChainSummary[]> {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    const qs = params.toString();
    const path = qs ? `/api/v1/chains?${qs}` : "/api/v1/chains";
    const r = await this.request<{ chains: ChainSummary[] }>("GET", path);
    return r.chains;
  }

  async getChain(chainId: string): Promise<ChainDetail> {
    return this.request("GET", `/api/v1/chains/${encodeURIComponent(chainId)}`);
  }

  async getAudit(chainId: string): Promise<IncidentReport> {
    return this.request("GET", `/api/v1/audit/${encodeURIComponent(chainId)}`);
  }

  // ----------------------------------------------------------- diagnostics

  async whoami(): Promise<WhoAmI> {
    return this.request("GET", "/api/v1/whoami");
  }

  // ------------------------------------------------------------ internals

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let resp: Response;
    try {
      resp = await this._fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new NetworkError(`${method} ${path} failed: ${msg}`);
    } finally {
      clearTimeout(timer);
    }

    let data: unknown;
    const text = await resp.text();
    if (text.length === 0) {
      data = null;
    } else {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (resp.status >= 200 && resp.status < 300) {
      return data as T;
    }

    const message = extractMessage(data);
    if (resp.status === 401) throw new AuthenticationError(message, 401, data);
    if (resp.status === 400) throw new InvalidPayloadError(message, 400, data);
    if (resp.status === 404) throw new NotFoundError(message, 404, data);
    throw new HeimdallError(message, resp.status, data);
  }
}

function extractMessage(body: unknown): string {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    const detail = obj.detail;
    if (detail && typeof detail === "object") {
      const d = detail as Record<string, unknown>;
      const m = d.message ?? d.error;
      if (typeof m === "string") return m;
      return JSON.stringify(detail);
    }
    if (typeof detail === "string") return detail;
    const m = obj.message ?? obj.error;
    if (typeof m === "string") return m;
    return JSON.stringify(body);
  }
  return String(body);
}
