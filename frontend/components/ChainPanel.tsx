"use client";
import { useMemo } from "react";
import clsx from "clsx";
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
  agents: AgentRow[];
  chainId: string;
}

/**
 * The dashboard's central panel when a chain is active.
 *
 * Visually mirrors a Side of the CompareView so the dashboard reads as
 * one product: verdict header at top, the ChainCanvas filling the body,
 * compact rule list + evidence + live incident report inline along the
 * bottom, no wasted space, no panel-soup.
 */
export function ChainPanel({ events, agents, chainId }: Props) {
  const summary = useChainSummary(events, chainId);
  const filtered = useMemo(
    () => events.filter((e) => {
      const cid = (e as { chain_id?: string }).chain_id;
      return !cid || cid === chainId;
    }),
    [events, chainId],
  );

  const verdict = summary.verdict ?? "PENDING";
  const verdictTone =
    verdict === "DENY" ? "text-deny" :
    verdict === "FLAG" ? "text-warn" :
    verdict === "ALLOW" ? "text-allow" :
    "text-zinc-500";
  const verdictDot =
    verdict === "DENY" ? "bg-deny" :
    verdict === "FLAG" ? "bg-warn" :
    verdict === "ALLOW" ? "bg-allow" :
    "bg-zinc-700";

  const subtitle =
    verdict === "DENY"
      ? "A delegation was blocked. Read the evidence below."
      : verdict === "FLAG"
        ? "A delegation flagged a rule but proceeded. Investigate the matched segment."
        : verdict === "ALLOW"
          ? "Every protocol invariant and policy primitive passed for this chain."
          : "Evaluating credentials…";

  return (
    <div className="card overflow-hidden">
      {/* Verdict header */}
      <div className="px-5 py-4 border-b border-edge flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-bifrost">§ LIVE CHAIN</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">{chainId.slice(0, 8)}</span>
          </div>
          <div className={clsx("font-display text-2xl md:text-3xl font-bold leading-none", verdictTone)}>
            <span className={clsx("inline-block w-2 h-2 mr-3 align-middle", verdictDot)} />
            {verdict}
          </div>
          <p className="mt-2 text-sm text-zinc-400 leading-snug max-w-[60ch]">{subtitle}</p>
        </div>
        <dl className="grid grid-cols-3 gap-x-8 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          <Stat label="hops"   value={summary.hopCount} />
          <Stat label="rules"  value={summary.totalRules} />
          <Stat
            label="denies"
            value={summary.deny}
            tone={summary.deny > 0 ? "deny" : "muted"}
          />
          <Stat label="allow" value={summary.allow} tone="allow" />
          <Stat label="flag"  value={summary.flag}  tone={summary.flag > 0 ? "warn" : "muted"} />
          <Stat
            label="tx"
            value={summary.txUrl ? "signed" : "—"}
            tone={summary.txUrl ? "deny" : "muted"}
          />
        </dl>
      </div>

      {/* Chain canvas */}
      <div
        className="relative"
        style={{ height: "min(560px, calc(100vh - 480px))", minHeight: "380px" }}
      >
        <ChainCanvas events={filtered} agents={agents} filterChainId={chainId} />
      </div>

      {/* Rules + evidence + incident report */}
      <div className="border-t border-edge grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-edge">
        <section className="lg:col-span-4 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow text-zinc-600">rule cards fired</div>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest">
              <span className="text-allow">{summary.allow}</span>
              <span className="text-warn">{summary.flag}</span>
              <span className="text-deny">{summary.deny}</span>
            </div>
          </div>
          <RuleList events={filtered} chainId={chainId} />
        </section>

        <section className="lg:col-span-4 p-5">
          <div className="eyebrow text-zinc-600 mb-3">evidence</div>
          {summary.denyReason ? (
            <pre className="font-mono text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
              <span className="text-deny">{summary.denyRule || "Layer 01 violation"}</span>
              {"\n"}
              {summary.denyReason}
            </pre>
          ) : summary.txUrl ? (
            <div>
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-2">
                Executor signed and broadcast a transaction. With real credentials this would move funds
                on-chain or write to the EHR.
              </p>
              <a
                href={summary.txUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-zinc-300 hover:text-bifrost transition"
              >
                <span className="dot bg-allow" />
                tx · {String(summary.txHash || summary.txUrl).slice(0, 18)}…  ↗
              </a>
            </div>
          ) : summary.flagReason ? (
            <pre className="font-mono text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
              <span className="text-warn">{summary.flagRule || "policy flag"}</span>
              {"\n"}
              {summary.flagReason}
            </pre>
          ) : (
            <p className="text-[12px] text-zinc-500 leading-relaxed">
              No denies, no flags, no tools fired yet. Routine traffic produces no evidence to surface.
            </p>
          )}
        </section>

        <section className="lg:col-span-4 p-5">
          <div className="eyebrow text-zinc-600 mb-3">incident report</div>
          <IncidentReport events={events} chainId={chainId} />
        </section>
      </div>
    </div>
  );
}

function Stat({
  label, value, tone = "default",
}: { label: string; value: number | string; tone?: "default" | "allow" | "warn" | "deny" | "muted" }) {
  const valueClass =
    tone === "allow" ? "text-allow" :
    tone === "warn"  ? "text-warn"  :
    tone === "deny"  ? "text-deny"  :
    tone === "muted" ? "text-zinc-600" :
    "text-zinc-200";
  return (
    <div className="flex flex-col items-end">
      <span className="text-zinc-600">{label}</span>
      <span className={clsx("font-medium text-base mt-0.5 tabular-nums", valueClass)} style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

/* ──────────────── rule list ──────────────── */

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
      const key = `${r.rule_name}:${r.result}`;
      seen.set(key, r);
    }
    return Array.from(seen.values())
      .sort((a, b) => rank(a.result) - rank(b.result))
      .slice(0, 8);
  }, [events, chainId]);

  if (!chainId) return <p className="text-[12px] text-zinc-500">No chain yet.</p>;
  if (rows.length === 0) {
    return <p className="text-[12px] text-zinc-500">No rule cards fired.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {rows.map((r, i) => (
        <li
          key={`${r.rule_name}:${r.result}:${i}`}
          className={clsx(
            "px-3 py-2 border text-xs flex items-baseline justify-between gap-3",
            r.result === "ALLOW" && "border-allow/30 bg-allow/5",
            r.result === "FLAG"  && "border-warn/40 bg-warn/5",
            r.result === "DENY"  && "border-deny/40 bg-deny/5",
          )}
        >
          <div className="flex items-baseline gap-2 min-w-0">
            <span className={clsx(
              "dot shrink-0",
              r.result === "ALLOW" && "bg-allow",
              r.result === "FLAG"  && "bg-warn",
              r.result === "DENY"  && "bg-deny",
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

/* ──────────────── chain summary hook ──────────────── */

interface ChainSummary {
  hopCount: number;
  allow: number;
  flag: number;
  deny: number;
  totalRules: number;
  verdict?: "ALLOW" | "FLAG" | "DENY";
  denyRule?: string;
  denyReason?: string;
  flagRule?: string;
  flagReason?: string;
  txUrl?: string;
  txHash?: string;
}

function useChainSummary(events: WsEvent[], chainId: string): ChainSummary {
  return useMemo(() => {
    const s: ChainSummary = { hopCount: 0, allow: 0, flag: 0, deny: 0, totalRules: 0 };
    for (const e of events) {
      if (e.type === "delegation" && e.chain_id === chainId) s.hopCount++;
      else if (e.type === "rule_evaluation") {
        const r = e as RuleEvaluationEvent;
        if (r.chain_id !== chainId) continue;
        s.totalRules++;
        if (r.result === "ALLOW") s.allow++;
        else if (r.result === "FLAG") {
          s.flag++;
          if (!s.flagReason) { s.flagRule = r.rule_name; s.flagReason = r.reason; }
        } else if (r.result === "DENY") {
          s.deny++;
          if (!s.denyReason && r.layer === "protocol") {
            s.denyRule = r.rule_name;
            s.denyReason = r.reason;
          } else if (!s.denyReason) {
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
    s.verdict = s.deny > 0 ? "DENY" : s.flag > 0 ? "FLAG" : s.allow > 0 ? "ALLOW" : undefined;
    return s;
  }, [events, chainId]);
}
