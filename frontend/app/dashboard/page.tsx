"use client";
import { useEffect, useMemo, useState } from "react";
import { AgentRegistry } from "@/components/AgentRegistry";
import { ChainCanvas } from "@/components/ChainCanvas";
import { CompareView } from "@/components/CompareView";
import { DashboardHeader } from "@/components/DashboardHeader";
import { IncidentReport } from "@/components/IncidentReport";
import { ReplayMode } from "@/components/ReplayMode";
import { RuleSidebar } from "@/components/RuleSidebar";
import { RuleSummary } from "@/components/RuleSummary";
import { ScenarioRail } from "@/components/ScenarioRail";
import { Stage } from "@/components/Stage";
import { Timeline } from "@/components/Timeline";
import { api } from "@/lib/api";
import { useWebSocket } from "@/lib/websocket";
import type { AgentRow, RuleEvaluationEvent, WsEvent } from "@/lib/types";

const MAX_EVENTS = 400;

type HealthState = "live" | "mock" | "down";

export default function Dashboard() {
  const [events, setEvents] = useState<WsEvent[]>([]);
  const [vertical, setVertical] = useState<string>("defi");
  const [heimdallEnabled, setHeimdallEnabled] = useState(true);
  const [registryNonce, setRegistryNonce] = useState(0);
  const [chainsNonce, setChainsNonce] = useState(0);
  const [activeChainId, setActiveChainId] = useState<string | null>(null);
  const [heimdallOnChainId, setHeimdallOnChainId] = useState<string | null>(null);
  const [heimdallOffChainId, setHeimdallOffChainId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [health, setHealth] = useState<{ gemini: HealthState; lobster: HealthState; sepolia: HealthState }>({
    gemini: "down", lobster: "down", sepolia: "down",
  });

  useEffect(() => {
    Promise.all([api.health(), api.agents(), api.toggleState()])
      .then(([h, a, t]: any[]) => {
        setHeimdallEnabled(t.enabled);
        setAgents(a.agents);
        setHealth({
          gemini: h.gemini_available ? "live" : "mock",
          lobster: h.lobster_trap_mocked ? "mock" : "live",
          sepolia: h.sepolia_mocked ? "mock" : "live",
        });
      })
      .catch(() => setHealth({ gemini: "down", lobster: "down", sepolia: "down" }));
  }, []);

  useEffect(() => {
    api.agents().then((a) => {
      setAgents(a.agents);
      setRegistryNonce((n) => n + 1);
    }).catch(() => {});
  }, [vertical]);

  useWebSocket((e) => {
    setEvents((prev) => {
      const next = prev.length >= MAX_EVENTS ? prev.slice(-MAX_EVENTS + 1) : prev.slice();
      next.push(e);
      return next;
    });
    if ("chain_id" in e && (e as { chain_id?: string }).chain_id) {
      setActiveChainId((e as { chain_id?: string }).chain_id!);
    }
    if (e.type === "scenario_start" && e.chain_id) {
      setActiveChainId(e.chain_id);
    }
    if (e.type === "scenario_end" && e.chain_id) {
      if (e.name === "attack") setHeimdallOnChainId(e.chain_id);
      if (e.name === "attack_no_heimdall") setHeimdallOffChainId(e.chain_id);
      setChainsNonce((n) => n + 1);
    }
    if (e.type === "vertical_switched") {
      setVertical(e.vertical);
      setEvents([]);
      setActiveChainId(null);
      setRegistryNonce((n) => n + 1);
    }
    if (e.type === "heimdall_toggle") setHeimdallEnabled(e.enabled);
  });

  const chainSummary = useMemo(() => {
    if (!activeChainId) return { depth: 0, verdict: null as null | "ALLOW" | "FLAG" | "DENY" };
    let depth = 0;
    let verdict: "ALLOW" | "FLAG" | "DENY" | null = null;
    for (const e of events) {
      if (e.type === "delegation" && e.chain_id === activeChainId) depth++;
      if (e.type === "rule_evaluation" && (e as RuleEvaluationEvent).chain_id === activeChainId) {
        const r = (e as RuleEvaluationEvent).result;
        if (r === "DENY") verdict = "DENY";
        else if (r === "FLAG" && verdict !== "DENY") verdict = "FLAG";
        else if (r === "ALLOW" && !verdict) verdict = "ALLOW";
      }
    }
    return { depth, verdict };
  }, [events, activeChainId]);

  const filteredEvents = activeChainId
    ? events.filter((e) => {
        const cid = (e as { chain_id?: string }).chain_id;
        return !cid || cid === activeChainId;
      })
    : events;

  const clearActive = () => {
    setEvents([]);
    setActiveChainId(null);
  };

  const hasActiveChain = activeChainId !== null && chainSummary.depth > 0;

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <DashboardHeader
        vertical={vertical}
        setVertical={setVertical}
        heimdallEnabled={heimdallEnabled}
        setHeimdallEnabled={setHeimdallEnabled}
        health={health}
        activeChainId={activeChainId}
        chainDepth={chainSummary.depth}
        verdict={chainSummary.verdict}
      />

      <div className="mb-3">
        <ScenarioRail
          vertical={vertical}
          onLaunch={() => { /* WS drives state */ }}
          onReset={clearActive}
        />
      </div>

      {compareOpen ? (
        <>
          <CompareView
            events={events}
            agents={agents}
            onChainId={heimdallOnChainId}
            offChainId={heimdallOffChainId}
            onClose={() => setCompareOpen(false)}
          />
          {/* Compact secondary row: agent registry + timeline only.
              RuleSummary, RuleSidebar, IncidentReport, Replay are all
              integrated inside CompareView when it is open. */}
          <div className="grid grid-cols-12 gap-3 mt-3">
            <aside className="col-span-12 lg:col-span-4">
              <AgentRegistry vertical={vertical} refreshNonce={registryNonce} />
            </aside>
            <div className="col-span-12 lg:col-span-8">
              <Timeline events={events} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-12 gap-3 mb-3">
            <div className="col-span-12 lg:col-span-9">
              {hasActiveChain ? (
                <div className="card relative" style={{ minHeight: "440px", height: "min(640px, calc(100vh - 360px))" }}>
                  <ChainCanvas events={filteredEvents} agents={agents} filterChainId={activeChainId ?? undefined} />
                </div>
              ) : (
                <Stage vertical={vertical} onLaunch={() => { /* WS drives state */ }} />
              )}
            </div>
            <aside className="col-span-12 lg:col-span-3 space-y-3">
              <RuleSummary events={events} filterChainId={activeChainId ?? undefined} />
              <RuleSidebar events={filteredEvents} filterChainId={activeChainId ?? undefined} />
            </aside>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <aside className="col-span-12 lg:col-span-3">
              <AgentRegistry vertical={vertical} refreshNonce={registryNonce} />
            </aside>
            <div className="col-span-12 lg:col-span-3 space-y-3">
              <ReplayMode refreshNonce={chainsNonce} onReplayStart={(c) => setActiveChainId(c)} />
              <button
                type="button"
                onClick={() => setCompareOpen((v) => !v)}
                className="card w-full px-4 py-3 text-left hover:bg-edge/40 transition"
              >
                <div className="font-display text-sm font-semibold text-zinc-100">
                  Compare Heimdall ON vs OFF
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mt-1">
                  side-by-side, same attack
                </div>
              </button>
            </div>
            <div className="col-span-12 lg:col-span-3">
              <Timeline events={events} />
            </div>
            <div className="col-span-12 lg:col-span-3">
              <IncidentReport events={events} chainId={activeChainId} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
