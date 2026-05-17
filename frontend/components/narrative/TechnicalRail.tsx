"use client";
import { AgentRegistry } from "@/components/AgentRegistry";
import { IncidentReport } from "@/components/IncidentReport";
import { ReplayMode } from "@/components/ReplayMode";
import { RuleSidebar } from "@/components/RuleSidebar";
import type { AgentRow, WsEvent } from "@/lib/types";

interface Props {
  events: WsEvent[];
  agents: AgentRow[];
  vertical: string;
  registryNonce: number;
  chainsNonce: number;
  activeChainId: string | null;
  onReplayStart: (chainId: string) => void;
}

/**
 * The always-visible right rail. Power users live here; narrative readers
 * can ignore it. Four stacked panels: rule cards, agent registry, replay,
 * incident report. Chain summary lives in each Act's header — duplicating
 * it here added noise without adding signal.
 */
export function TechnicalRail({
  events,
  vertical,
  registryNonce,
  chainsNonce,
  activeChainId,
  onReplayStart,
}: Props) {
  void agentsUnused;
  return (
    <div className="space-y-3 sticky top-4">
      <RuleSidebar events={events} filterChainId={activeChainId ?? undefined} />
      <AgentRegistry vertical={vertical} refreshNonce={registryNonce} />
      <ReplayMode refreshNonce={chainsNonce} onReplayStart={onReplayStart} />
      <IncidentReport events={events} chainId={activeChainId} />
    </div>
  );
}

// Retain the `agents` prop in the type but mark it deliberately unused
// so existing callers do not break during the deploy. Will remove in a
// follow-up cleanup pass.
const agentsUnused: AgentRow[] = [];
