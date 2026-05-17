"use client";
import { useMemo } from "react";
import clsx from "clsx";
import type { NarrationScript, Vertical } from "@/lib/plainEnglish";
import { hopKey } from "@/lib/plainEnglish";
import type { AgentRow, DelegationEvent, WsEvent } from "@/lib/types";

interface Props {
  events: WsEvent[];
  chainId: string | null;
  script: NarrationScript;
  agents: AgentRow[];
  vertical: Vertical;
}

/**
 * Renders a numbered, plain-English narration of what happened during a
 * single chain run. Listens to the events list and matches each
 * delegation hop to a script entry keyed by (caller role -> callee role).
 *
 * Falls back to a generic "X delegated to Y" line if the script doesn't
 * cover a hop.
 */
export function Narrator({ events, chainId, script, agents }: Props) {
  const lines = useMemo(() => {
    if (!chainId) return [] as { kind: "intro" | "hop" | "ext" | "blocked" | "end"; text: string }[];

    const out: { kind: "intro" | "hop" | "ext" | "blocked" | "end"; text: string }[] = [];
    const roleOf = (id: string): string => {
      if (id.startsWith("user-")) return "user";
      const a = agents.find((x) => x.id === id);
      return a?.role || "agent";
    };

    let hasIntro = false;
    let blocked = false;

    for (const e of events) {
      const cid = (e as { chain_id?: string }).chain_id;
      if (cid && cid !== chainId) continue;

      if (e.type === "scenario_start" && script.scenarioStart && !hasIntro) {
        out.push({ kind: "intro", text: script.scenarioStart });
        hasIntro = true;
      } else if (e.type === "delegation") {
        const d = e as DelegationEvent;
        const key = hopKey(roleOf(d.caller_id), roleOf(d.callee_id));
        const text = script.delegations[key] ?? `${roleOf(d.caller_id)} → ${roleOf(d.callee_id)} (${d.action})`;
        out.push({ kind: "hop", text });
      } else if (e.type === "external_content_flagged" && script.external) {
        out.push({ kind: "ext", text: script.external });
      } else if (e.type === "scenario_blocked" && !blocked) {
        blocked = true;
        if (script.blocked) out.push({ kind: "blocked", text: script.blocked });
      } else if (e.type === "rule_evaluation" && e.result === "DENY" && e.layer === "protocol" && !blocked) {
        blocked = true;
        if (script.blocked) out.push({ kind: "blocked", text: script.blocked });
      } else if (e.type === "scenario_end" && script.scenarioEnd && !blocked) {
        out.push({ kind: "end", text: script.scenarioEnd });
      }
    }

    return out;
  }, [events, chainId, script, agents]);

  if (lines.length === 0) {
    return (
      <p className="text-[13px] text-zinc-500 leading-relaxed">
        Press play above to start the story.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {lines.map((l, i) => (
        <li
          key={i}
          className={clsx(
            "flex gap-3 items-start text-[13.5px] leading-relaxed transition-opacity",
            l.kind === "ext" && "text-warn",
            l.kind === "blocked" && "text-deny",
            l.kind === "end" && "text-allow",
            l.kind === "intro" && "text-zinc-300",
            l.kind === "hop" && "text-zinc-200",
          )}
        >
          <span
            className={clsx(
              "font-mono text-[10px] tracking-widest uppercase shrink-0 mt-1 w-6 text-right",
              l.kind === "intro" ? "text-zinc-500" :
              l.kind === "hop"   ? "text-bifrost" :
              l.kind === "ext"   ? "text-warn" :
              l.kind === "blocked" ? "text-deny" :
              "text-allow",
            )}
          >
            {l.kind === "intro" ? "··" :
             l.kind === "ext" ? "!!" :
             l.kind === "blocked" ? "✗" :
             l.kind === "end" ? "✓" :
             String(i).padStart(2, "0")}
          </span>
          <span dangerouslySetInnerHTML={{ __html: l.text }} />
        </li>
      ))}
    </ol>
  );
}
