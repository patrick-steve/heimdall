"use client";
import { useState } from "react";
import { api } from "@/lib/api";

interface Props {
  onScenarioStart: (name: string) => void;
}

export function ScenarioControls({ onScenarioStart }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (name: string, payload: Record<string, unknown> = {}) => {
    setBusy(name);
    onScenarioStart(name);
    try { await api.runScenario(name, payload); }
    catch { /* server already broadcasts the failure */ }
    finally { setBusy(null); }
  };

  const Btn = ({ name, label, payload }: { name: string; label: string; payload?: Record<string, unknown> }) => (
    <button
      onClick={() => run(name, payload ?? {})}
      disabled={!!busy}
      className="px-3 py-1.5 rounded-md bg-slab border border-edge text-xs hover:bg-edge transition disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {busy === name ? "running…" : label}
    </button>
  );

  return (
    <div className="card p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Scenarios</h3>
      <div className="flex flex-wrap gap-2">
        <Btn name="routine" label="1. Routine" />
        <Btn name="rebalance" label="2. Rebalance $500" payload={{ amount_usd: 500 }} />
        <Btn name="attack" label="3. Attack" />
        <Btn name="attack_no_heimdall" label="6. Attack (Heimdall OFF)" />
      </div>
    </div>
  );
}
