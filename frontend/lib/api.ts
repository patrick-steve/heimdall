import type { AgentRow } from "./types";

export const BACKEND = process.env.NEXT_PUBLIC_HEIMDALL_API ?? "http://127.0.0.1:8000";

async function call<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  if (res.headers.get("content-type")?.includes("application/json")) return res.json();
  return (await res.text()) as unknown as T;
}

export const api = {
  health: () => call("GET", "/api/health"),

  agents: () => call<{ vertical: string; agents: AgentRow[] }>("GET", "/api/agents"),
  switchVertical: (name: string) => call("POST", `/api/vertical/${name}`),
  currentVertical: () => call<{ active: string; available: string[] }>("GET", "/api/vertical"),

  toggle: (on: boolean) => call("POST", `/api/heimdall/${on ? "on" : "off"}`),
  toggleState: () => call<{ enabled: boolean }>("GET", "/api/heimdall/state"),

  runScenario: (name: string, payload: Record<string, unknown> = {}) =>
    call("POST", `/api/scenario/${name}`, payload),

  listChains: () =>
    call<{
      chains: { chain_id: string; hop_count: number; started_at: string; head_caller: string; head_callee: string }[];
    }>("GET", "/api/replay/chains"),
  getChain: (chainId: string) =>
    call<{
      chain_id: string;
      credentials: Record<string, unknown>[];
      evaluations: Record<string, unknown>[];
    }>("GET", `/api/replay/${chainId}`),
  replayChain: (chainId: string, speed: number) =>
    call("POST", `/api/replay/${chainId}?speed=${speed}`),

  generateReport: async (chainId: string): Promise<Response> => {
    return fetch(`${BACKEND}/api/audit/report/${chainId}`, { method: "POST" });
  },
  reportMdUrl: (chainId: string) => `${BACKEND}/api/audit/report/${chainId}.md`,
  reportPdfUrl: (chainId: string) => `${BACKEND}/api/audit/report/${chainId}.pdf`,
};
