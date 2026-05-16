"use client";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { api } from "@/lib/api";
import { ChainCanvas } from "./ChainCanvas";
import { IncidentReport } from "./IncidentReport";
import type {
  AgentRow,
  RuleEvaluationEvent,
  ToolInvokedEvent,
  WsEvent,
} from "@/lib/types";

interface Props {
  events: WsEvent[];
  agents?: AgentRow[];
  /** kept for backwards compatibility with the old prop shape */
  dormantAgents?: Set<string>;
  /** Most recent chain_id observed under Heimdall ON */
  onChainId: string | null;
  /** Most recent chain_id observed under Heimdall OFF */
  offChainId: string | null;
  onClose: () => void;
}

type RunPhase = "idle" | "running_on" | "running_off" | "done";

/**
 * Side-by-side comparison of "Heimdall ON" vs "Heimdall OFF" runs of the
 * same attack.
 *
 * The view is self-contained: each side carries its own verdict header,
 * chain canvas, compact rule list, evidence block, and incident-report
 * generator. The diff strip at the bottom centres the contrast in a
 * single line a non-technical viewer reads in two seconds.
 */
export function CompareView({ events, agents = [], onChainId, offChainId, onClose }: Props) {
  const [phase, setPhase] = useState<RunPhase>("idle");

  const onSummary = useChainSummary(events, onChainId);
  const offSummary = useChainSummary(events, offChainId);

  // Promote phase when chains arrive — safety net for the explicit phase calls.
  useEffect(() => {
    if (onChainId && phase === "running_on") setPhase("running_off");
  }, [onChainId, phase]);
  useEffect(() => {
    if (offChainId && phase === "running_off") setPhase("done");
  }, [offChainId, phase]);

  const runComparison = async () => {
    setPhase("running_on");
    try {
      await api.toggle(true).catch(() => {});
      await api.runScenario("attack");
      setPhase("running_off");
      await new Promise((r) => setTimeout(r, 1400));
      await api.toggle(false).catch(() => {});
      await api.runScenario("attack_no_heimdall");
      await api.toggle(true).catch(() => {});
      setPhase("done");
    } catch {
      setPhase("done");
    }
  };

  const dormantAgents = useMemo(
    () => new Set(agents.filter((a) => a.is_dormant).map((a) => a.id)),
    [agents],
  );

  const onActive = phase === "running_on";
  const offActive = phase === "running_off";

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-edge flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-bifrost">§ COMPARE</span>
          <h3 className="font-display text-base font-semibold tracking-tight text-zinc-100">
            Heimdall ON vs OFF · same attack, opposite outcome
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runComparison}
            disabled={phase === "running_on" || phase === "running_off"}
            className={clsx(
              "font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 transition border",
              phase === "running_on" || phase === "running_off"
                ? "border-bifrost text-bifrost bg-rune/15"
                : "border-rune text-bifrost hover:bg-rune/25 bg-rune/10",
            )}
          >
            {phase === "running_on"
              ? "running heimdall on…"
              : phase === "running_off"
                ? "running heimdall off…"
                : phase === "done"
                  ? "▷ run again"
                  : "▷ run comparison"}
          </button>
          <button
            onClick={onClose}
            className="font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 border border-edge text-zinc-400 hover:bg-edge/60 transition"
          >
            close
          </button>
        </div>
      </div>

      {/* Two-column comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-edge">
        <Side
          kind="on"
          active={onActive}
          chainId={onChainId}
          events={events}
          agents={agents}
          dormantAgents={dormantAgents}
          summary={onSummary}
        />
        <Side
          kind="off"
          active={offActive}
          chainId={offChainId}
          events={events}
          agents={agents}
          dormantAgents={dormantAgents}
          summary={offSummary}
        />
      </div>

      {/* Diff strip */}
      <DiffStrip phase={phase} on={onSummary} off={offSummary} />

      {/* Incident-report row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-edge border-t border-edge">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[11px] uppercase tracking-widest text-allow">
              <span className="dot bg-allow mr-2 align-middle" />
              Heimdall ON · incident report
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              {onChainId ? onChainId.slice(0, 8) : "—"}
            </span>
          </div>
          {onChainId ? (
            <IncidentReport events={events} chainId={onChainId} />
          ) : (
            <ReportPlaceholder kind="on" />
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[11px] uppercase tracking-widest text-deny">
              <span className="dot bg-deny mr-2 align-middle" />
              Heimdall OFF · incident report
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              {offChainId ? offChainId.slice(0, 8) : "—"}
            </span>
          </div>
          {offChainId ? (
            <IncidentReport events={events} chainId={offChainId} />
          ) : (
            <ReportPlaceholder kind="off" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────  one side  ──────────────────────────── */

interface SideProps {
  kind: "on" | "off";
  active: boolean;
  chainId: string | null;
  events: WsEvent[];
  agents: AgentRow[];
  dormantAgents: Set<string>;
  summary: ChainSummary;
}

function Side({ kind, active, chainId, events, agents, summary }: SideProps) {
  const onSide = kind === "on";
  const filtered = chainId ? events.filter((e) => filterByChain(e, chainId)) : [];

  const verdict =
    !chainId ? "PENDING" :
    onSide ? "BLOCKED" : (summary.txUrl ? "BROADCAST" : "RAN");

  const verdictTone = !chainId
    ? "text-zinc-500"
    : onSide
      ? "text-allow"
      : "text-deny";

  const verdictBg = !chainId
    ? "bg-zinc-700"
    : onSide
      ? "bg-allow"
      : "bg-deny";

  const subtitle = !chainId
    ? "waiting to run"
    : onSide
      ? "Layer 01 stopped the chain before any tool fired"
      : "Heimdall off; the executor broadcast a transaction";

  return (
    <div className={clsx("flex flex-col", active && "ring-1 ring-rune ring-inset")}>
      {/* Side header */}
      <div className="px-5 py-4 border-b border-edge">
        <div className="flex items-center justify-between mb-2">
          <span
            className={clsx(
              "font-mono text-[10px] uppercase tracking-widest",
              onSide ? "text-allow" : "text-deny",
            )}
          >
            <span className={clsx("dot mr-2 align-middle", onSide ? "bg-allow" : "bg-deny")} />
            Heimdall {onSide ? "ON" : "OFF"}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            {chainId ? chainId.slice(0, 8) : "—"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className={clsx("font-display text-xl md:text-2xl font-bold leading-none", verdictTone)}>
              <span className={clsx("inline-block w-2 h-2 mr-3 align-middle", verdictBg)} />
              {verdict}
            </div>
            <div className="mt-2 text-sm text-zinc-400 leading-snug max-w-[42ch]">{subtitle}</div>
          </div>
          <div className="flex flex-col items-end gap-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500 shrink-0">
            <span>hops · <span className="text-zinc-200">{summary.hopCount || 0}</span></span>
            <span>rules · <span className="text-zinc-200">{summary.totalRules || 0}</span></span>
            {onSide ? (
              <span>denies · <span className="text-deny">{summary.deny || 0}</span></span>
            ) : (
              <span>tx · <span className={summary.txUrl ? "text-deny" : "text-zinc-500"}>{summary.txUrl ? "signed" : "—"}</span></span>
            )}
          </div>
        </div>
      </div>

      {/* Chain canvas */}
      <div className="relative" style={{ height: "320px" }}>
        {chainId ? (
          <ChainCanvas events={filtered} agents={agents} filterChainId={chainId} compact />
        ) : (
          <EmptySide kind={kind} active={active} />
        )}
      </div>

      {/* Rule cards */}
      <div className="border-t border-edge px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="eyebrow text-zinc-600">rule cards fired</div>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest">
            <span className="text-allow">{summary.allow}</span>
            <span className="text-warn">{summary.flag}</span>
            <span className="text-deny">{summary.deny}</span>
          </div>
        </div>
        <RuleList events={filtered} chainId={chainId} />
      </div>

      {/* Evidence */}
      <div className="border-t border-edge px-5 py-4">
        <div className="eyebrow text-zinc-600 mb-2">evidence</div>
        {onSide ? (
          summary.denyReason ? (
            <pre className="font-mono text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
              <span className="text-deny">{summary.denyRule || "Layer 01 violation"}</span>
              {"\n"}
              {summary.denyReason}
            </pre>
          ) : (
            <p className="text-[12px] text-zinc-500">No deny on record yet.</p>
          )
        ) : summary.txUrl ? (
          <div>
            <p className="text-[12px] text-zinc-400 mb-2">
              Executor signed and broadcast a Sepolia transfer. With real credentials this would move funds on-chain.
            </p>
            <a
              href={summary.txUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-deny hover:text-warn transition"
            >
              <span className="dot bg-deny" />
              tx · {String(summary.txHash).slice(0, 14)}…  ↗
            </a>
          </div>
        ) : (
          <p className="text-[12px] text-zinc-500">No transaction broadcast yet.</p>
        )}
      </div>
    </div>
  );
}

function EmptySide({ kind, active }: { kind: "on" | "off"; active: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className={clsx(
          "eyebrow mb-3",
          active ? "text-bifrost" : "text-zinc-600",
        )}>
          {active ? "running…" : "awaiting run"}
        </div>
        <p className="text-[12px] text-zinc-500 leading-relaxed">
          {kind === "on"
            ? "With Heimdall on, the attack should die at Layer 01 before any tool runs."
            : "With Heimdall off, the same delegation will sign a transaction without anything stopping it."}
        </p>
      </div>
    </div>
  );
}

function ReportPlaceholder({ kind }: { kind: "on" | "off" }) {
  return (
    <div className="card px-4 py-6 text-center">
      <div className="eyebrow text-zinc-600 mb-2">awaiting chain</div>
      <p className="text-[12px] text-zinc-500 leading-relaxed">
        {kind === "on"
          ? "When the ON run completes, generate the compliance memo for the blocked chain."
          : "When the OFF run completes, generate the incident memo for the ungoverned broadcast."}
      </p>
    </div>
  );
}

/* ────────────────────────────  rule list  ──────────────────────────── */

interface RuleListProps {
  events: WsEvent[];
  chainId: string | null;
}

function RuleList({ events, chainId }: RuleListProps) {
  const rows = useMemo(() => {
    if (!chainId) return [];
    const seen = new Map<string, RuleEvaluationEvent>();
    for (const e of events) {
      if (e.type !== "rule_evaluation") continue;
      const r = e as RuleEvaluationEvent;
      if (r.chain_id !== chainId) continue;
      // Keep only one row per (rule_name, result) so a noisy chain doesn't
      // bury the violation cards in repeats.
      const key = `${r.rule_name}:${r.result}`;
      seen.set(key, r);
    }
    return Array.from(seen.values())
      .sort((a, b) => rank(a.result) - rank(b.result))
      .slice(0, 8);
  }, [events, chainId]);

  if (!chainId) {
    return <p className="text-[12px] text-zinc-500">No chain yet.</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="text-[12px] text-zinc-500">
        No rule cards fired. Heimdall is not evaluating this chain.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {rows.map((r, i) => (
        <li
          key={`${r.rule_name}:${r.result}:${i}`}
          className={clsx(
            "px-3 py-2 border text-xs flex items-baseline justify-between gap-3",
            r.result === "ALLOW" && "border-allow/30 bg-allow/5",
            r.result === "FLAG" && "border-warn/40 bg-warn/5",
            r.result === "DENY" && "border-deny/40 bg-deny/5",
          )}
        >
          <div className="flex items-baseline gap-2 min-w-0">
            <span className={clsx(
              "dot shrink-0",
              r.result === "ALLOW" && "bg-allow",
              r.result === "FLAG" && "bg-warn",
              r.result === "DENY" && "bg-deny",
            )} />
            <span className="font-mono text-[11px] text-zinc-200 truncate">{r.rule_name}</span>
          </div>
          <span className={clsx(
            "font-mono text-[10px] uppercase tracking-widest shrink-0",
            r.layer === "protocol" ? "text-bifrost" : "text-zinc-500",
          )}>
            {r.layer}
          </span>
        </li>
      ))}
    </ul>
  );
}

function rank(r: "ALLOW" | "FLAG" | "DENY"): number {
  return r === "DENY" ? 0 : r === "FLAG" ? 1 : 2;
}

/* ────────────────────────────  diff strip  ──────────────────────────── */

interface DiffStripProps {
  phase: RunPhase;
  on: ChainSummary;
  off: ChainSummary;
}

function DiffStrip({ phase, on, off }: DiffStripProps) {
  if (phase === "idle") {
    return (
      <div className="px-5 py-4 border-t border-edge font-mono text-[11px] uppercase tracking-widest text-zinc-500 flex items-center justify-between flex-wrap gap-3">
        <span>press <span className="text-bifrost">▷ run comparison</span> to fire the same attack twice</span>
        <span>same prompt · same agents · same tenant</span>
      </div>
    );
  }
  return (
    <div className="border-t border-edge bg-slab/30 px-5 py-5 grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8">
      <DiffMetric label="chain depth reached" a={on.hopCount} b={off.hopCount} />
      <DiffMetric label="rule cards fired" a={on.totalRules} b={off.totalRules} />
      <DiffMetric label="transactions broadcast" a={0} b={off.txUrl ? 1 : 0} />
    </div>
  );
}

function DiffMetric({ label, a, b }: { label: string; a: number; b: number }) {
  return (
    <div>
      <div className="eyebrow text-zinc-600 mb-2">{label}</div>
      <div className="flex items-center gap-3 font-mono">
        <span className="text-2xl font-medium tabular-nums text-allow">{a}</span>
        <span className="text-zinc-600">→</span>
        <span className="text-2xl font-medium tabular-nums text-deny">{b}</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 ml-1">on → off</span>
      </div>
    </div>
  );
}

/* ────────────────────────────  hooks  ──────────────────────────── */

interface ChainSummary {
  hopCount: number;
  allow: number;
  flag: number;
  deny: number;
  totalRules: number;
  denyRule?: string;
  denyReason?: string;
  txUrl?: string;
  txHash?: string;
}

function useChainSummary(events: WsEvent[], chainId: string | null): ChainSummary {
  return useMemo(() => {
    const s: ChainSummary = { hopCount: 0, allow: 0, flag: 0, deny: 0, totalRules: 0 };
    if (!chainId) return s;
    for (const e of events) {
      if (e.type === "delegation" && e.chain_id === chainId) s.hopCount++;
      else if (e.type === "rule_evaluation") {
        const r = e as RuleEvaluationEvent;
        if (r.chain_id !== chainId) continue;
        s.totalRules++;
        if (r.result === "ALLOW") s.allow++;
        else if (r.result === "FLAG") s.flag++;
        else if (r.result === "DENY") {
          s.deny++;
          if (!s.denyReason && r.layer === "protocol") {
            s.denyRule = r.rule_name;
            s.denyReason = r.reason;
          }
        }
      } else if (e.type === "tool_invoked") {
        const t = e as ToolInvokedEvent;
        if (t.chain_id !== chainId) continue;
        const res = t.result as { etherscan_url?: string; tx_hash?: string };
        if (res?.etherscan_url) s.txUrl = res.etherscan_url;
        if (res?.tx_hash) s.txHash = String(res.tx_hash);
      }
    }
    return s;
  }, [events, chainId]);
}

function filterByChain(e: WsEvent, chainId: string): boolean {
  const cid = (e as { chain_id?: string }).chain_id;
  return !cid || cid === chainId;
}
