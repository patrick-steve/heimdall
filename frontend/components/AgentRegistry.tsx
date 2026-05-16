"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { api } from "@/lib/api";
import type { AgentRow } from "@/lib/types";

interface Props {
  vertical: string;
  refreshNonce: number;
}

export function AgentRegistry({ vertical, refreshNonce }: Props) {
  const [agents, setAgents] = useState<AgentRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.agents()
      .then((r) => { if (!cancelled) setAgents(r.agents); })
      .catch(() => { if (!cancelled) setAgents([]); });
    return () => { cancelled = true; };
  }, [vertical, refreshNonce]);

  return (
    <div className="card p-3 h-full overflow-auto">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-3">Agent Registry</h3>
      <div className="space-y-2">
        {agents.map((a) => (
          <div
            key={a.id}
            className={clsx(
              "rounded-md border px-3 py-2 text-xs",
              a.is_dormant
                ? "border-zinc-700 bg-zinc-900/40 text-zinc-500"
                : "border-edge bg-slab text-zinc-200",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate">{a.display_name}</span>
              {a.is_dormant && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-warn/20 text-warn uppercase">dormant</span>
              )}
            </div>
            <div className="font-mono text-[10px] text-zinc-500 mt-0.5 truncate">{a.id}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {a.scope.map((s) => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-edge text-bifrost font-mono">{s}</span>
              ))}
            </div>
            {a.is_dormant && a.owner && (
              <div className="mt-1 text-[10px] italic text-zinc-500">owner: {a.owner}</div>
            )}
          </div>
        ))}
        {agents.length === 0 && (
          <div className="text-xs text-zinc-500 py-6 text-center">No agents loaded.</div>
        )}
      </div>
    </div>
  );
}
