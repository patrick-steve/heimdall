"use client";
import { useMemo } from "react";
import clsx from "clsx";
import { AgentRegistry } from "@/components/AgentRegistry";
import { IncidentReport } from "@/components/IncidentReport";
import { ReplayMode } from "@/components/ReplayMode";
import { RuleSidebar } from "@/components/RuleSidebar";
import type { AgentRow, RuleEvaluationEvent, WsEvent } from "@/lib/types";

interface Props {
  events: WsEvent[];
  agents: AgentRow[];
  vertical: string;
  registryNonce: number;
  chainsNonce: number;
  activeChainId: string | null;
  health: { gemini: "live" | "mock" | "down"; lobster: "live" | "mock" | "down"; sepolia: "live" | "mock" | "down" };
  onReplayStart: (chainId: string) => void;
}

/**
 * The always-visible right rail. Power users live here; narrative readers
 * can ignore it. Six stacked panels: subsystem health, current chain
 * summary, rule sidebar, agent registry, replay, incident report.
 */
export function TechnicalRail({
  events,
  agents,
  vertical,
  registryNonce,
  chainsNonce,
  activeChainId,
  health,
  onReplayStart,
}: Props) {
  const summary = useMemo(() => {
    let depth = 0;
    let allow = 0;
    let flag = 0;
    let deny = 0;
    if (!activeChainId) return { depth: 0, allow: 0, flag: 0, deny: 0, verdict: null as null | "ALLOW" | "FLAG" | "DENY" };
    for (const e of events) {
      if (e.type === "delegation" && e.chain_id === activeChainId) depth++;
      else if (e.type === "rule_evaluation") {
        const r = e as RuleEvaluationEvent;
        if (r.chain_id !== activeChainId) continue;
        if (r.result === "ALLOW") allow++;
        else if (r.result === "FLAG") flag++;
        else if (r.result === "DENY") deny++;
      }
    }
    return {
      depth, allow, flag, deny,
      verdict: deny > 0 ? "DENY" : flag > 0 ? "FLAG" : allow > 0 ? "ALLOW" : null,
    } as const;
  }, [events, activeChainId]);

  return (
    <div className="space-y-3 sticky top-4">
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-edge">
          <div className="eyebrow text-bifrost">§ live state</div>
        </div>
        <div className="px-4 py-3 space-y-2 font-mono text-[10px] uppercase tracking-widest">
          {(["gemini", "lobster", "sepolia"] as const).map((k) => (
            <div key={k} className="flex items-center justify-between text-zinc-500">
              <span>{k === "lobster" ? "lobster trap" : k}</span>
              <span className={clsx(
                health[k] === "live" && "text-allow",
                health[k] === "mock" && "text-warn",
                health[k] === "down" && "text-deny",
              )}>
                <span className={clsx(
                  "dot mr-2",
                  health[k] === "live" && "bg-allow",
                  health[k] === "mock" && "bg-warn",
                  health[k] === "down" && "bg-deny",
                )} />
                {health[k]}
              </span>
            </div>
          ))}
          <div className="border-t border-edge mt-2 pt-2 space-y-1.5">
            <div className="flex items-center justify-between text-zinc-500">
              <span>chain</span>
              <span className="text-zinc-300">{activeChainId ? activeChainId.slice(0, 8) : "—"}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-500">
              <span>depth</span>
              <span className="text-zinc-300">{summary.depth}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-500">
              <span>verdict</span>
              <span className={clsx(
                summary.verdict === "ALLOW" && "text-allow",
                summary.verdict === "FLAG"  && "text-warn",
                summary.verdict === "DENY"  && "text-deny",
                !summary.verdict && "text-zinc-600",
              )}>
                {summary.verdict ?? "idle"}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-500">
              <span>rules</span>
              <span className="text-zinc-300">
                <span className="text-allow">{summary.allow}</span> · <span className="text-warn">{summary.flag}</span> · <span className="text-deny">{summary.deny}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <RuleSidebar events={events} filterChainId={activeChainId ?? undefined} />
      <AgentRegistry vertical={vertical} refreshNonce={registryNonce} />
      <ReplayMode refreshNonce={chainsNonce} onReplayStart={onReplayStart} />
      <IncidentReport events={events} chainId={activeChainId} />
    </div>
  );
}
