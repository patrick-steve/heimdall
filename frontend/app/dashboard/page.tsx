"use client";
import { useEffect, useMemo, useState } from "react";
import { Act } from "@/components/narrative/Act";
import { Cast } from "@/components/narrative/Cast";
import { CompareAct } from "@/components/narrative/CompareAct";
import { NarrativeHero } from "@/components/narrative/NarrativeHero";
import { TechnicalRail } from "@/components/narrative/TechnicalRail";
import { Stage } from "@/components/Stage";
import {
  ATTACK_COPY,
  ATTACK_SCRIPT,
  ROUTINE_COPY,
  ROUTINE_SCRIPT,
  type Vertical,
} from "@/lib/plainEnglish";
import { api } from "@/lib/api";
import { useWebSocket } from "@/lib/websocket";
import type { AgentRow, WsEvent } from "@/lib/types";

const MAX_EVENTS = 400;
type HealthState = "live" | "mock" | "down";

export default function Dashboard() {
  const [events, setEvents] = useState<WsEvent[]>([]);
  const [vertical, setVertical] = useState<Vertical>("defi");
  const [heimdallEnabled, setHeimdallEnabled] = useState(true);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [registryNonce, setRegistryNonce] = useState(0);
  const [chainsNonce, setChainsNonce] = useState(0);
  const [routineChainId, setRoutineChainId] = useState<string | null>(null);
  const [attackChainId, setAttackChainId] = useState<string | null>(null);
  const [onChainId, setOnChainId] = useState<string | null>(null);
  const [offChainId, setOffChainId] = useState<string | null>(null);
  const [activeChainId, setActiveChainId] = useState<string | null>(null);
  const [health, setHealth] = useState<{ gemini: HealthState; lobster: HealthState; sepolia: HealthState }>({
    gemini: "down", lobster: "down", sepolia: "down",
  });

  /**
   * When the user clicks a play button we capture the next chain that
   * arrives on the WebSocket and route it to the right act. We track
   * pendingTarget to know which act should receive the next chain_id.
   */
  const [pendingTarget, setPendingTarget] = useState<
    null | "routine" | "rebalance" | "attack" | "compare_on" | "compare_off"
  >(null);

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
    // Reset chain bindings on vertical switch
    setRoutineChainId(null);
    setAttackChainId(null);
    setOnChainId(null);
    setOffChainId(null);
    setActiveChainId(null);
  }, [vertical]);

  useWebSocket((e) => {
    setEvents((prev) => {
      const next = prev.length >= MAX_EVENTS ? prev.slice(-MAX_EVENTS + 1) : prev.slice();
      next.push(e);
      return next;
    });

    if (e.type === "scenario_start" && e.chain_id) {
      setActiveChainId(e.chain_id);
      // Route to whichever act asked for it
      if (pendingTarget === "routine" || e.name === "routine") setRoutineChainId(e.chain_id);
      else if (pendingTarget === "attack" || e.name === "attack") {
        if (pendingTarget === "compare_on") setOnChainId(e.chain_id);
        else setAttackChainId(e.chain_id);
      } else if (pendingTarget === "compare_off" || e.name === "attack_no_heimdall") {
        setOffChainId(e.chain_id);
      }
    }

    if (e.type === "scenario_end" && e.chain_id) {
      if (e.name === "attack") setOnChainId(e.chain_id);
      if (e.name === "attack_no_heimdall") setOffChainId(e.chain_id);
      setChainsNonce((n) => n + 1);
      setPendingTarget(null);
    }

    if (e.type === "heimdall_toggle") setHeimdallEnabled(e.enabled);
  });

  const isCS = vertical === "customer_service";

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <NarrativeHero
        vertical={vertical}
        setVertical={setVertical}
        heimdallEnabled={heimdallEnabled}
        setHeimdallEnabled={setHeimdallEnabled}
      />

      <div className="grid grid-cols-12 gap-4">
        <main className="col-span-12 xl:col-span-8 space-y-4">
          {isCS ? (
            <Stage vertical={vertical} />
          ) : (
            <>
              <Cast vertical={vertical} />

              <Act
                index="02"
                vertical={vertical}
                events={events}
                agents={agents}
                chainId={routineChainId}
                scenarioName="routine"
                copy={ROUTINE_COPY[vertical]}
                script={ROUTINE_SCRIPT[vertical]}
                onLaunch={() => setPendingTarget("routine")}
              />

              <Act
                index="03"
                vertical={vertical}
                events={events}
                agents={agents}
                chainId={attackChainId}
                scenarioName="attack"
                copy={ATTACK_COPY[vertical]}
                script={ATTACK_SCRIPT[vertical]}
                showReasons
                onLaunch={() => setPendingTarget("attack")}
              />

              <CompareAct
                vertical={vertical}
                events={events}
                agents={agents}
                onChainId={onChainId}
                offChainId={offChainId}
                onLaunchOn={() => setPendingTarget("compare_on")}
                onLaunchOff={() => setPendingTarget("compare_off")}
              />
            </>
          )}
        </main>

        <aside className="col-span-12 xl:col-span-4">
          <TechnicalRail
            events={events}
            agents={agents}
            vertical={vertical}
            registryNonce={registryNonce}
            chainsNonce={chainsNonce}
            activeChainId={activeChainId}
            health={health}
            onReplayStart={setActiveChainId}
          />
        </aside>
      </div>
    </div>
  );
}
