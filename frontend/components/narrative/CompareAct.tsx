"use client";
import { useState } from "react";
import clsx from "clsx";
import { ChainCanvas } from "@/components/ChainCanvas";
import { api } from "@/lib/api";
import type {
  AgentRow,
  RuleEvaluationEvent,
  ToolInvokedEvent,
  WsEvent,
} from "@/lib/types";

interface Props {
  vertical: string;
  events: WsEvent[];
  agents: AgentRow[];
  onChainId: string | null;
  offChainId: string | null;
  onLaunchOn: () => void;
  onLaunchOff: () => void;
}

type Phase = "idle" | "running_on" | "running_off" | "done";

/**
 * Act 4 — Heimdall ON vs OFF, narrative wrapper.
 *
 * Same idea as the full CompareView but stripped down to what a
 * non-technical reader needs to see: two chain canvases, two verdict
 * cards in plain English, one big diff line at the bottom.
 */
export function CompareAct({
  vertical,
  events,
  agents,
  onChainId,
  offChainId,
  onLaunchOn,
  onLaunchOff,
}: Props) {
  void vertical;
  const [phase, setPhase] = useState<Phase>("idle");

  const onSummary = chainSummary(events, onChainId);
  const offSummary = chainSummary(events, offChainId);

  const runBoth = async () => {
    setPhase("running_on");
    try {
      await api.toggle(true).catch(() => {});
      onLaunchOn();
      await api.runScenario("attack");
      setPhase("running_off");
      await new Promise((r) => setTimeout(r, 1400));
      await api.toggle(false).catch(() => {});
      onLaunchOff();
      await api.runScenario("attack_no_heimdall");
      await api.toggle(true).catch(() => {});
      setPhase("done");
    } catch {
      setPhase("done");
    }
  };

  return (
    <section className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-edge flex items-baseline justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-bifrost">§ Act 4</span>
          <h2 className="font-display text-base font-semibold text-zinc-100">
            With Heimdall vs without
          </h2>
        </div>
        <button
          onClick={runBoth}
          disabled={phase === "running_on" || phase === "running_off"}
          className={clsx(
            "font-mono text-[11px] uppercase tracking-wider px-4 py-2 transition border",
            phase === "idle" || phase === "done"
              ? "border-rune bg-rune/10 text-bifrost hover:bg-rune/25"
              : "border-bifrost bg-rune/15 text-bifrost",
          )}
        >
          {phase === "running_on" ? "running with Heimdall…" :
           phase === "running_off" ? "running without Heimdall…" :
           phase === "done" ? "▷ run again" :
           "▷ run both"}
        </button>
      </div>

      {phase === "idle" && (
        <div className="px-5 py-6">
          <p className="text-zinc-300 leading-relaxed text-[14px] max-w-prose mb-4">
            Same attack as Act 3. Same agents. Same poisoned content. We&rsquo;ll run it twice:
            once with Heimdall on, once with Heimdall off. Watch what happens.
          </p>
          <ul className="text-[12.5px] text-zinc-500 leading-relaxed space-y-1 max-w-prose">
            <li>· On the left, Heimdall is on. We expect a clean block.</li>
            <li>· On the right, Heimdall is off. We expect the attack to go through.</li>
            <li>· The diff at the bottom tells you the cost in one line.</li>
          </ul>
        </div>
      )}

      {phase !== "idle" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-edge">
            <Side
              kind="on"
              chainId={onChainId}
              events={events}
              agents={agents}
              summary={onSummary}
              active={phase === "running_on"}
            />
            <Side
              kind="off"
              chainId={offChainId}
              events={events}
              agents={agents}
              summary={offSummary}
              active={phase === "running_off"}
            />
          </div>

          <DiffStrip on={onSummary} off={offSummary} />
        </>
      )}
    </section>
  );
}

/* ──────────────── one side ──────────────── */

interface SideProps {
  kind: "on" | "off";
  chainId: string | null;
  events: WsEvent[];
  agents: AgentRow[];
  summary: ChainSummary;
  active: boolean;
}

function Side({ kind, chainId, events, agents, summary, active }: SideProps) {
  const onSide = kind === "on";
  const verdict =
    !chainId ? "WAITING…" :
    onSide ? "BLOCKED" : (summary.txUrl ? "SIGNED" : "FINISHED");
  const tone =
    !chainId ? "text-zinc-500" :
    onSide ? "text-allow" :
    "text-deny";
  const dot =
    !chainId ? "bg-zinc-700" :
    onSide ? "bg-allow" :
    "bg-deny";
  const subtitle =
    !chainId ? "queued" :
    onSide
      ? "The attack was stopped before any tool ran."
      : "Heimdall was off. The transaction went through.";

  return (
    <div className={clsx("flex flex-col", active && "ring-1 ring-rune ring-inset")}>
      <div className="px-5 py-3 border-b border-edge">
        <div className="flex items-center justify-between mb-2">
          <span className={clsx("font-mono text-[10px] uppercase tracking-widest", onSide ? "text-allow" : "text-deny")}>
            <span className={clsx("dot mr-2 align-middle", onSide ? "bg-allow" : "bg-deny")} />
            Heimdall {onSide ? "ON" : "OFF"}
          </span>
          {chainId && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">{chainId.slice(0, 8)}</span>
          )}
        </div>
        <div className={clsx("font-display text-lg font-bold leading-none", tone)}>
          <span className={clsx("inline-block w-2 h-2 mr-2 align-middle", dot)} />
          {verdict}
        </div>
        <p className="text-[12.5px] text-zinc-400 leading-snug mt-1.5">{subtitle}</p>
      </div>
      <div className="relative" style={{ height: "260px" }}>
        {chainId ? (
          <ChainCanvas events={events} agents={agents} filterChainId={chainId} compact />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              {active ? "running…" : "awaiting"}
            </span>
          </div>
        )}
      </div>
      {chainId && !onSide && summary.txUrl && (
        <div className="px-5 py-3 border-t border-edge">
          <a
            href={summary.txUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-deny hover:text-warn transition"
          >
            <span className="dot bg-deny" />
            transaction broadcast ↗
          </a>
        </div>
      )}
    </div>
  );
}

/* ──────────────── diff strip ──────────────── */

function DiffStrip({ on, off }: { on: ChainSummary; off: ChainSummary }) {
  return (
    <div className="border-t border-edge bg-slab/30 px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-8">
      <Metric label="steps reached"            a={on.hopCount}                 b={off.hopCount} />
      <Metric label="rules that fired"         a={on.totalRules}               b={off.totalRules} />
      <Metric label="transactions broadcast"   a={0}                           b={off.txUrl ? 1 : 0} highlight />
    </div>
  );
}

function Metric({ label, a, b, highlight }: { label: string; a: number; b: number; highlight?: boolean }) {
  return (
    <div>
      <div className="eyebrow text-zinc-600 mb-1">{label}</div>
      <div className="flex items-baseline gap-3 font-mono">
        <span className={clsx("text-xl font-medium tabular-nums", highlight ? "text-allow" : "text-zinc-300")}>
          {a}
        </span>
        <span className="text-zinc-600 text-sm">→</span>
        <span className={clsx("text-xl font-medium tabular-nums", highlight ? "text-deny" : "text-zinc-300")}>
          {b}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 ml-1">on → off</span>
      </div>
    </div>
  );
}

/* ──────────────── summary helper ──────────────── */

interface ChainSummary {
  hopCount: number;
  totalRules: number;
  deny: number;
  flag: number;
  txUrl?: string;
}

function chainSummary(events: WsEvent[], chainId: string | null): ChainSummary {
  const s: ChainSummary = { hopCount: 0, totalRules: 0, deny: 0, flag: 0 };
  if (!chainId) return s;
  for (const e of events) {
    if (e.type === "delegation" && e.chain_id === chainId) s.hopCount++;
    else if (e.type === "rule_evaluation") {
      const r = e as RuleEvaluationEvent;
      if (r.chain_id !== chainId) continue;
      s.totalRules++;
      if (r.result === "DENY") s.deny++;
      else if (r.result === "FLAG") s.flag++;
    } else if (e.type === "tool_invoked") {
      const t = e as ToolInvokedEvent;
      if (t.chain_id !== chainId) continue;
      const res = t.result as { etherscan_url?: string };
      if (res?.etherscan_url) s.txUrl = res.etherscan_url;
    }
  }
  return s;
}
