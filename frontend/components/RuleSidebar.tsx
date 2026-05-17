"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { RuleEvaluationEvent, WsEvent } from "@/lib/types";

interface Props {
  events: WsEvent[];
  /** When set, only show evaluations for this chain id. */
  filterChainId?: string;
}

export function RuleSidebar({ events, filterChainId }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const cards = useMemo(() => {
    // Dedupe by (chain_id, rule_name, layer). A Layer 2 rule re-fires after
    // every signed hop and once more in the counterfactual block, so the same
    // rule shows up many times for one chain — we want the *current* verdict,
    // not every intermediate one. Severity wins ties: DENY > FLAG > ALLOW;
    // within the same severity the latest event wins.
    const SEVERITY: Record<string, number> = { ALLOW: 0, FLAG: 1, DENY: 2 };
    const byKey = new Map<string, RuleEvaluationEvent>();
    for (const e of events) {
      if (e.type !== "rule_evaluation") continue;
      const r = e as RuleEvaluationEvent;
      if (filterChainId && r.chain_id !== filterChainId) continue;
      const key = `${r.chain_id}::${r.rule_name}::${r.layer}`;
      const prev = byKey.get(key);
      if (!prev || SEVERITY[r.result] >= SEVERITY[prev.result]) {
        byKey.set(key, r);
      }
    }
    // Order: DENY → FLAG → ALLOW, then by rule name for stable layout.
    return Array.from(byKey.values())
      .sort((a, b) => {
        const sd = SEVERITY[b.result] - SEVERITY[a.result];
        if (sd !== 0) return sd;
        return a.rule_name.localeCompare(b.rule_name);
      })
      .slice(0, 40);
  }, [events, filterChainId]);

  return (
    <div className="card p-3 h-full overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">Rule Evaluations</h3>
        <span className="text-xs text-zinc-500">{cards.length} cards</span>
      </div>
      <div className="space-y-2">
        {cards.length === 0 && (
          <div className="text-xs text-zinc-500 px-1 py-6 text-center">
            No rules evaluated yet. Run a scenario.
          </div>
        )}
        {cards.map((r, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setExpanded(expanded === i ? null : i)}
            className={clsx(
              "w-full text-left px-3 py-2 rounded-md border text-xs transition",
              "hover:bg-edge",
              r.result === "ALLOW" && "border-allow/30 bg-allow/5",
              r.result === "FLAG" && "border-warn/40 bg-warn/5",
              r.result === "DENY" && "border-deny/40 bg-deny/5",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={clsx(
                    "dot shrink-0",
                    r.result === "ALLOW" && "bg-allow",
                    r.result === "FLAG" && "bg-warn",
                    r.result === "DENY" && "bg-deny",
                  )}
                />
                <span className="font-mono truncate">{r.rule_name}</span>
              </div>
              <span
                className={clsx(
                  "text-[10px] px-1.5 py-0.5 rounded uppercase shrink-0",
                  r.layer === "protocol"
                    ? "bg-rune/20 text-bifrost"
                    : "bg-edge text-zinc-400",
                )}
              >
                {r.layer}
              </span>
            </div>
            <div className="mt-1 text-zinc-400 truncate">{r.reason}</div>
            {expanded === i && (
              <div className="mt-2 pt-2 border-t border-edge font-mono text-[11px] text-zinc-400 space-y-1">
                <div>type: {r.rule_type}</div>
                {r.matched_segment && <div>matched: {r.matched_segment}</div>}
                {r.counterfactual && (
                  <div className="text-warn">⚠ counterfactual — would have caught at Layer 2</div>
                )}
                <div>ts: {r.ts ?? ""}</div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
