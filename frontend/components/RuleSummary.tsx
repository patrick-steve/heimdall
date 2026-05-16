"use client";
import { useMemo } from "react";
import clsx from "clsx";
import type { RuleEvaluationEvent, WsEvent } from "@/lib/types";

interface Props {
  events: WsEvent[];
  filterChainId?: string;
}

export function RuleSummary({ events, filterChainId }: Props) {
  const { allow, flag, deny, protocol, policy, lastReason } = useMemo(() => {
    let allow = 0, flag = 0, deny = 0, protocol = 0, policy = 0;
    let lastReason: { result: "ALLOW" | "FLAG" | "DENY"; reason: string; rule: string } | undefined;
    for (const e of events) {
      if (e.type !== "rule_evaluation") continue;
      const r = e as RuleEvaluationEvent;
      if (filterChainId && r.chain_id !== filterChainId) continue;
      if (r.result === "ALLOW") allow++;
      else if (r.result === "FLAG") flag++;
      else if (r.result === "DENY") deny++;
      if (r.layer === "protocol") protocol++;
      else policy++;
      if (r.result !== "ALLOW") {
        lastReason = { result: r.result, reason: r.reason, rule: r.rule_name };
      }
    }
    return { allow, flag, deny, protocol, policy, lastReason };
  }, [events, filterChainId]);

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 grid grid-cols-3 divide-x divide-edge border-b border-edge">
        <Stat label="ALLOW" count={allow} tone="allow" />
        <Stat label="FLAG"  count={flag}  tone="warn" />
        <Stat label="DENY"  count={deny}  tone="deny" />
      </div>
      <div className="px-4 py-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        <span>layer 01 · <span className="text-bifrost">{protocol}</span></span>
        <span>layer 02 · <span className="text-zinc-300">{policy}</span></span>
      </div>
      {lastReason && (
        <div className="px-4 py-3 border-t border-edge">
          <div className="eyebrow text-zinc-600 mb-1">last violation</div>
          <div className="flex items-baseline gap-2">
            <span className={clsx(
              "font-mono text-[10px] uppercase tracking-widest",
              lastReason.result === "DENY" ? "text-deny" : "text-warn",
            )}>
              {lastReason.result}
            </span>
            <span className="font-mono text-[11px] text-zinc-300 truncate">{lastReason.rule}</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 leading-snug line-clamp-2">{lastReason.reason}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, count, tone }: { label: string; count: number; tone: "allow" | "warn" | "deny" }) {
  return (
    <div className="px-2 py-1 flex flex-col items-center">
      <span
        className={clsx(
          "font-mono font-medium text-2xl tabular-nums",
          tone === "allow" && "text-allow",
          tone === "warn"  && "text-warn",
          tone === "deny"  && "text-deny",
        )}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {count}
      </span>
      <span className={clsx(
        "font-mono text-[10px] uppercase tracking-widest mt-1",
        tone === "allow" && "text-allow/70",
        tone === "warn"  && "text-warn/70",
        tone === "deny"  && "text-deny/80",
      )}>
        {label}
      </span>
    </div>
  );
}
