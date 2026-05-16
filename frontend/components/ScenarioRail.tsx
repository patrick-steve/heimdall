"use client";
import { useState } from "react";
import clsx from "clsx";
import { api } from "@/lib/api";

interface Props {
  vertical: string;
  compareOpen: boolean;
  onLaunch?: (name: string) => void;
  onReset?: () => void;
  onToggleCompare?: () => void;
}

interface RailItem {
  name: string;
  label: string;
  subtle: string;
  tone: "allow" | "deny";
  payload?: Record<string, unknown>;
}

const RAILS: Record<string, RailItem[]> = {
  defi: [
    { name: "routine",            label: "Routine",          subtle: "2-hop · all green",  tone: "allow" },
    { name: "rebalance",          label: "Rebalance $500",   subtle: "3-hop · Sepolia tx", tone: "allow", payload: { amount_usd: 500 } },
    { name: "attack",             label: "Attack",           subtle: "Layer 01 dies it",   tone: "deny"  },
    { name: "attack_no_heimdall", label: "Attack · OFF",     subtle: "no governance",      tone: "deny"  },
  ],
  healthcare: [
    { name: "routine",            label: "Triage",            subtle: "2-hop · chart pull", tone: "allow" },
    { name: "rebalance",          label: "Add prescription",  subtle: "3-hop · EHR write",  tone: "allow", payload: { dose_mg: 10 } },
    { name: "attack",             label: "Lab feed attack",   subtle: "Layer 01 dies it",   tone: "deny"  },
    { name: "attack_no_heimdall", label: "Attack · OFF",      subtle: "no governance",      tone: "deny"  },
  ],
  customer_service: [],
};

export function ScenarioRail({ vertical, compareOpen, onLaunch, onReset, onToggleCompare }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const rail = RAILS[vertical] ?? [];

  if (rail.length === 0) {
    return (
      <div className="card flex items-center justify-between px-4 py-2.5 gap-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-warn">scenarios · configuration only</span>
          <span className="font-mono text-[11px] text-zinc-500">policy.yaml loaded · no agents or tools wired</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCompare}
            className={clsx(
              "font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 transition border",
              compareOpen
                ? "border-bifrost bg-rune/15 text-bifrost"
                : "border-edge text-zinc-400 hover:bg-edge/60",
            )}
          >
            compare on vs off
          </button>
          <button
            onClick={onReset}
            className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 hover:text-bifrost transition"
          >
            clear
          </button>
        </div>
      </div>
    );
  }

  const run = async (scenario: RailItem) => {
    setBusy(scenario.name);
    onLaunch?.(scenario.name);
    try {
      if (scenario.name === "attack_no_heimdall") {
        await api.toggle(false).catch(() => {});
      }
      await api.runScenario(scenario.name, scenario.payload ?? {});
    } catch {
      /* surface via WS */
    } finally {
      setBusy(null);
      if (scenario.name === "attack_no_heimdall") {
        await api.toggle(true).catch(() => {});
      }
    }
  };

  return (
    <div className="card flex items-stretch divide-x divide-edge overflow-hidden">
      <div className="px-4 py-2.5 flex items-center gap-3 shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">scenarios</span>
      </div>
      {rail.map((s) => (
        <button
          key={s.name}
          type="button"
          onClick={() => run(s)}
          disabled={!!busy}
          className={clsx(
            "flex-1 min-w-[150px] px-4 py-2.5 text-left transition group",
            busy === s.name ? "bg-rune/10" : "hover:bg-edge/60",
            busy && busy !== s.name && "opacity-30 cursor-not-allowed",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-[13px] font-semibold tracking-tight text-zinc-100">{s.label}</span>
            <span className={clsx("dot", s.tone === "allow" ? "bg-allow" : "bg-deny")} />
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mt-1">
            {busy === s.name ? "running…" : s.subtle}
          </div>
        </button>
      ))}

      {/* Promoted Compare toggle. Lives in the rail so it is always visible,
          never buried in a tertiary card. */}
      <button
        type="button"
        onClick={onToggleCompare}
        className={clsx(
          "px-4 py-2.5 text-left transition shrink-0 min-w-[180px]",
          compareOpen ? "bg-rune/15" : "hover:bg-edge/60",
        )}
        title="Side-by-side comparison of the same attack with Heimdall on and off"
      >
        <div className="flex items-center justify-between">
          <span className={clsx(
            "font-display text-[13px] font-semibold tracking-tight",
            compareOpen ? "text-bifrost" : "text-zinc-100",
          )}>
            {compareOpen ? "Exit compare" : "Compare ON vs OFF"}
          </span>
          <span className={clsx(
            "font-mono text-[10px] uppercase tracking-widest",
            compareOpen ? "text-bifrost" : "text-zinc-600",
          )}>
            {compareOpen ? "live" : "▷"}
          </span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mt-1">
          {compareOpen ? "back to live chain" : "same attack, both verdicts"}
        </div>
      </button>

      <button
        type="button"
        onClick={onReset}
        className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-zinc-500 hover:text-bifrost hover:bg-edge/60 transition shrink-0"
        title="Clear graph and rule sidebar"
      >
        clear
      </button>
    </div>
  );
}
