"use client";
import { useState } from "react";
import clsx from "clsx";
import { ChainCanvas } from "@/components/ChainCanvas";
import { Narrator } from "./Narrator";
import { api } from "@/lib/api";
import type {
  ActCopy,
  NarrationScript,
  RuleHit,
  Vertical,
} from "@/lib/plainEnglish";
import { explainRules } from "@/lib/plainEnglish";
import type {
  AgentRow,
  RuleEvaluationEvent,
  ToolInvokedEvent,
  WsEvent,
} from "@/lib/types";

interface Props {
  /** Act index for the eyebrow, e.g. "02" */
  index: string;
  vertical: Vertical;
  events: WsEvent[];
  agents: AgentRow[];
  /** chain_id this act is watching. Set by the parent when the scenario fires. */
  chainId: string | null;
  /** Which backend scenario this act triggers when the play button is clicked. */
  scenarioName: string;
  scenarioPayload?: Record<string, unknown>;
  /** Per-vertical script + headline copy. */
  copy: ActCopy;
  script: NarrationScript;
  /** Whether to autoplay on first mount. Default false. */
  autoplay?: boolean;
  /** Whether to render the plain-English "why" reasons below the narrator on block. */
  showReasons?: boolean;
  onLaunch: (scenarioName: string) => void;
}

export function Act({
  index,
  vertical,
  events,
  agents,
  chainId,
  scenarioName,
  scenarioPayload,
  copy,
  script,
  autoplay = false,
  showReasons = false,
  onLaunch,
}: Props) {
  void vertical;
  const [busy, setBusy] = useState(false);
  void autoplay;

  const launch = async () => {
    if (busy) return;
    setBusy(true);
    onLaunch(scenarioName);
    try {
      await api.runScenario(scenarioName, scenarioPayload ?? {});
    } catch {
      /* surfaced via WS */
    } finally {
      setBusy(false);
    }
  };

  const summary = useChainSummary(events, chainId);
  const reasons = showReasons ? explainRules(summary.hits) : [];

  const verdict =
    !chainId ? "PENDING" :
    summary.deny > 0 ? "BLOCKED" :
    summary.flag > 0 ? "FLAGGED" :
    summary.totalRules > 0 ? "ALLOWED" :
    "RUNNING";

  const verdictTone =
    verdict === "BLOCKED" ? "text-deny" :
    verdict === "FLAGGED" ? "text-warn" :
    verdict === "ALLOWED" ? "text-allow" :
    "text-zinc-500";

  const verdictDot =
    verdict === "BLOCKED" ? "bg-deny" :
    verdict === "FLAGGED" ? "bg-warn" :
    verdict === "ALLOWED" ? "bg-allow" :
    "bg-zinc-700";

  const outcomeLabel = verdict === "BLOCKED" ? copy.outcomeBlocked : copy.outcomeOk;
  const showOutcome = chainId && (summary.deny > 0 || (summary.totalRules > 0 && !busy));

  return (
    <section className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-edge flex items-baseline justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-bifrost">§ Act {index}</span>
          <h2 className="font-display text-base font-semibold text-zinc-100">{copy.title}</h2>
        </div>
        {chainId && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            chain {chainId.slice(0, 8)}
          </span>
        )}
      </div>

      {!chainId ? (
        <div className="px-5 py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-7">
            <p className="text-zinc-300 leading-relaxed text-[14px] mb-5 max-w-prose"
               dangerouslySetInnerHTML={{ __html: copy.intro }} />
            <button
              onClick={launch}
              disabled={busy}
              className={clsx(
                "font-mono text-[11px] uppercase tracking-wider px-4 py-2 transition border",
                busy
                  ? "border-bifrost bg-rune/15 text-bifrost"
                  : "border-rune bg-rune/10 text-bifrost hover:bg-rune/25",
              )}
            >
              {busy ? "running…" : `▷ ${copy.cta}`}
            </button>
          </div>
          <div className="md:col-span-5">
            <PreviewCanvas agents={agents} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-edge">
          <div className="lg:col-span-7 relative" style={{ minHeight: "320px" }}>
            <ChainCanvas events={events} agents={agents} filterChainId={chainId} />
          </div>
          <aside className="lg:col-span-5 p-5 space-y-4">
            <div className="eyebrow text-zinc-600">what happened</div>
            <Narrator
              events={events}
              chainId={chainId}
              script={script}
              agents={agents}
              vertical={vertical}
            />
          </aside>
        </div>
      )}

      {/* Outcome chip + replay */}
      {showOutcome && (
        <div className="border-t border-edge px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-3">
            <span className={clsx("font-display text-base font-semibold", verdictTone)}>
              <span className={clsx("inline-block w-2 h-2 mr-2 align-middle", verdictDot)} />
              {verdict}
            </span>
            <span className="text-[13px] text-zinc-400">{outcomeLabel}</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            <span>steps · <span className="text-zinc-300">{summary.hopCount}</span></span>
            <span>rules · <span className="text-zinc-300">{summary.totalRules}</span></span>
            <button
              onClick={launch}
              disabled={busy}
              className="text-bifrost hover:text-glacier transition"
              title="Run again"
            >
              ↻ replay
            </button>
          </div>
        </div>
      )}

      {/* Plain-English reasons (attack act only) */}
      {chainId && showReasons && reasons.length > 0 && (
        <div className="border-t border-edge px-5 py-4">
          <div className="eyebrow text-zinc-600 mb-3">why heimdall blocked it</div>
          <ul className="space-y-3">
            {reasons.slice(0, 4).map((r) => (
              <li key={r.rule} className="flex items-start gap-3">
                <span
                  className={clsx(
                    "font-mono text-[10px] uppercase tracking-widest mt-1 shrink-0",
                    r.result === "DENY" ? "text-deny" : "text-warn",
                  )}
                >
                  {r.result === "DENY" ? "✗" : "!!"}
                </span>
                <div>
                  <p className="text-[13.5px] text-zinc-200 leading-snug"
                     dangerouslySetInnerHTML={{ __html: r.headline }} />
                  <p className="text-[12px] text-zinc-500 leading-relaxed mt-0.5"
                     dangerouslySetInnerHTML={{ __html: r.aside }} />
                  <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-600 mt-1">
                    rule · <span className="text-zinc-500">{r.rule}</span> · layer {r.layer === "protocol" ? "01" : "02"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ──────────────── preview canvas before play ──────────────── */

function PreviewCanvas({ agents }: { agents: AgentRow[] }) {
  if (agents.length === 0) {
    return (
      <div className="border border-edge bg-slab/40 h-[180px] flex items-center justify-center">
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-600">awaiting</span>
      </div>
    );
  }
  return (
    <div className="border border-edge bg-slab/40 h-[180px] relative overflow-hidden">
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-600">
        <span>chain · not yet running</span>
        <span>press play</span>
      </div>
      <ChainCanvas events={[]} agents={agents} compact />
    </div>
  );
}

/* ──────────────── chain summary hook ──────────────── */

interface ChainSummary {
  hopCount: number;
  allow: number;
  flag: number;
  deny: number;
  totalRules: number;
  hits: RuleHit[];
  txUrl?: string;
}

function useChainSummary(events: WsEvent[], chainId: string | null): ChainSummary {
  const s: ChainSummary = { hopCount: 0, allow: 0, flag: 0, deny: 0, totalRules: 0, hits: [] };
  if (!chainId) return s;

  // Dedupe rule evaluations by (rule_name, layer) per chain. Layer 2 rules
  // re-fire after every hop + the counterfactual sweep; the badge should
  // count distinct rules and their worst verdict, not raw emissions.
  const SEVERITY: Record<string, number> = { ALLOW: 0, FLAG: 1, DENY: 2 };
  const verdictByRule = new Map<string, RuleEvaluationEvent>();

  for (const e of events) {
    if (e.type === "delegation" && e.chain_id === chainId) {
      s.hopCount++;
    } else if (e.type === "rule_evaluation") {
      const r = e as RuleEvaluationEvent;
      if (r.chain_id !== chainId) continue;
      const key = `${r.rule_name}::${r.layer}`;
      const prev = verdictByRule.get(key);
      if (!prev || SEVERITY[r.result] >= SEVERITY[prev.result]) {
        verdictByRule.set(key, r);
      }
    } else if (e.type === "tool_invoked") {
      const t = e as ToolInvokedEvent;
      if (t.chain_id !== chainId) continue;
      const res = t.result as { etherscan_url?: string };
      if (res?.etherscan_url) s.txUrl = res.etherscan_url;
    }
  }

  for (const r of verdictByRule.values()) {
    s.totalRules++;
    if (r.result === "ALLOW") s.allow++;
    else if (r.result === "FLAG") { s.flag++; s.hits.push({ rule: r.rule_name, result: "FLAG", layer: r.layer }); }
    else if (r.result === "DENY") { s.deny++; s.hits.push({ rule: r.rule_name, result: "DENY", layer: r.layer }); }
  }
  return s;
}
