"use client";
import { useMemo } from "react";
import clsx from "clsx";
import type { WsEvent } from "@/lib/types";

interface Props { events: WsEvent[] }

export function Timeline({ events }: Props) {
  const items = useMemo(() => {
    return events.slice(-15).reverse().map((e, i) => ({ i, ...summarise(e) }));
  }, [events]);

  return (
    <div className="card p-3 max-h-48 overflow-auto">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Timeline</h3>
        <span className="text-[10px] text-zinc-500">{events.length} events</span>
      </div>
      <ul className="space-y-1 text-xs">
        {items.map((it) => (
          <li key={it.i} className="flex gap-2">
            <span className={clsx("dot mt-1 shrink-0", it.dotClass)} />
            <span className="font-mono text-zinc-500">{it.tsShort}</span>
            <span className="text-zinc-300 truncate">{it.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function summarise(e: WsEvent): { text: string; dotClass: string; tsShort: string } {
  const ts = (e as { ts?: string }).ts ?? "";
  const tsShort = ts.slice(11, 19);
  switch (e.type) {
    case "delegation":
      return { text: `${e.caller_id} → ${e.callee_id}  ${e.action}`, dotClass: "bg-allow", tsShort };
    case "rule_evaluation":
      return {
        text: `[${e.layer}] ${e.rule_name}: ${e.result}`,
        dotClass: e.result === "ALLOW" ? "bg-allow" : e.result === "FLAG" ? "bg-warn" : "bg-deny",
        tsShort,
      };
    case "tool_invoked":
      return { text: `tool: ${e.tool} ${e.note ?? ""}`, dotClass: "bg-bifrost", tsShort };
    case "scenario_start":
    case "scenario_end":
    case "scenario_blocked":
      return { text: `scenario ${e.type.split("_")[1]}: ${e.name}`, dotClass: "bg-rune", tsShort };
    case "external_content_flagged":
      return { text: `Lobster Trap flagged external content`, dotClass: "bg-warn", tsShort };
    case "vertical_switched":
      return { text: `vertical → ${e.vertical}`, dotClass: "bg-bifrost", tsShort };
    case "heimdall_toggle":
      return { text: `heimdall ${e.enabled ? "ON" : "OFF"}`, dotClass: e.enabled ? "bg-allow" : "bg-deny", tsShort };
    case "agents_synced":
      return { text: `agents synced: ${e.count} in ${e.vertical}`, dotClass: "bg-zinc-500", tsShort };
    default:
      return { text: e.type, dotClass: "bg-zinc-500", tsShort };
  }
}
