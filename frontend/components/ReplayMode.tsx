"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { api } from "@/lib/api";

interface ChainSummary {
  chain_id: string;
  hop_count: number;
  started_at: string;
  head_caller: string;
  head_callee: string;
}

interface Props {
  refreshNonce: number;
  onReplayStart?: (chainId: string) => void;
}

const SPEEDS = [1, 2, 4] as const;

export function ReplayMode({ refreshNonce, onReplayStart }: Props) {
  const [chains, setChains] = useState<ChainSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [speed, setSpeed] = useState<number>(2);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.listChains()
      .then((r) => { if (!cancelled) setChains(r.chains); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [refreshNonce]);

  const replay = async () => {
    if (!selected) return;
    setBusy(true);
    onReplayStart?.(selected);
    try {
      await api.replayChain(selected, speed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Forensic Replay</h3>
        <span className="text-[10px] text-zinc-500">{chains.length} chains</span>
      </div>
      <div className="flex flex-wrap gap-2 items-center text-xs">
        <select
          value={selected ?? ""}
          onChange={(e) => setSelected(e.target.value || null)}
          className="bg-slab border border-edge rounded px-2 py-1 text-zinc-200 font-mono text-[10px] flex-1 min-w-[160px]"
        >
          <option value="">Select chain…</option>
          {chains.map((c) => (
            <option key={c.chain_id} value={c.chain_id}>
              {c.chain_id.slice(0, 8)}… · {c.hop_count} hops · {c.head_caller.replace("agent-", "")} → {c.head_callee.replace("agent-", "")}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={clsx(
                "px-2 py-1 rounded text-[10px] font-mono border",
                speed === s ? "bg-rune/20 border-rune text-bifrost" : "border-edge text-zinc-400 hover:bg-edge",
              )}
            >
              {s}x
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!selected || busy}
          onClick={replay}
          className="px-3 py-1 rounded bg-rune/20 border border-rune text-bifrost hover:bg-rune/30 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {busy ? "replaying…" : "replay"}
        </button>
      </div>
    </div>
  );
}
