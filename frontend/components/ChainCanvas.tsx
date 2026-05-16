"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { AgentRow, DelegationEvent, RuleEvaluationEvent, WsEvent } from "@/lib/types";

/**
 * Deterministic horizontal-flow chain renderer.
 *
 * Replaces the previous D3 force-directed graph, which failed because:
 *   - Force simulation snapped nodes to (0,0) before the SVG measured itself.
 *   - The entire scene rebuilt on every WebSocket event, killing animation.
 *   - Empty state and SVG fought for the same z-stack.
 *
 * Design: the chain is *known* in shape. User session sits left; the agent
 * lanes occupy fixed vertical positions; edges flow left-to-right driven by
 * the hops that have actually been signed. The agent registry is always
 * pre-rendered as inert lanes so the topology is visible even before any
 * scenario has run.
 */

const ROLE_ORDER: Record<string, number> = {
  coordinator: 0,
  data_fetcher: 1,
  executor: 2,
  shadow: 3,
};

const COL = {
  user: 70,
  agentMin: 240,
  agentMax: 760,
} as const;

interface Props {
  events: WsEvent[];
  agents: AgentRow[];
  /** Filter to a specific chain (used by CompareView) */
  filterChainId?: string;
  compact?: boolean;
}

interface Lane {
  id: string;
  label: string;
  role: string;
  dormant: boolean;
  y: number;
  x: number;
}

interface Edge {
  key: string;
  fromId: string;
  toId: string;
  status: "ok" | "flag" | "deny";
  hopIndex: number;
  action: string;
  declared?: string;
  detected?: string;
}

interface DenyInfo {
  fromId: string;
  toId: string;
  rule: string;
  reason: string;
  layer: "protocol" | "policy";
}

const USER_ID = "user-session-001";

export function ChainCanvas({ events, agents, filterChainId, compact = false }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: compact ? 280 : 420 });

  // observe parent size for crisp coordinates
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setSize({ w: Math.max(360, cr.width), h: Math.max(compact ? 220 : 320, cr.height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact]);

  const { lanes, edges, denyEdge, chainSummary } = useMemo(() => {
    return buildScene(events, agents, filterChainId, size, compact);
  }, [events, agents, filterChainId, size, compact]);

  const showEmpty = chainSummary.hopCount === 0;

  return (
    <div ref={wrapRef} className="relative w-full h-full overflow-hidden">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.w} ${size.h}`}
        preserveAspectRatio="none"
        className="block"
      >
        <defs>
          <linearGradient id="cc-edge-ok" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"  stopColor="#7c3aed" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="1" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="cc-edge-flag" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"  stopColor="#f59e0b" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.7" />
          </linearGradient>
          <marker id="cc-arrow-ok" viewBox="0 -5 10 10" refX="9" refY="0" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0,-4L9,0L0,4" fill="#a78bfa" />
          </marker>
          <marker id="cc-arrow-flag" viewBox="0 -5 10 10" refX="9" refY="0" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0,-4L9,0L0,4" fill="#fbbf24" />
          </marker>
          <marker id="cc-arrow-deny" viewBox="0 -5 10 10" refX="9" refY="0" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0,-4L9,0L0,4" fill="#ef4444" />
          </marker>
        </defs>

        {/* Background guides */}
        {!compact && (
          <g opacity="0.4">
            {lanes.map((l) => (
              <line key={`g-${l.id}`} x1={0} y1={l.y} x2={size.w} y2={l.y} stroke="#1c232c" strokeWidth="1" strokeDasharray="2 6" />
            ))}
          </g>
        )}

        {/* Column dividers */}
        <g opacity="0.35">
          {[0, 1, 2, 3].map((depth) => {
            const x = depthToX(depth, size.w);
            return (
              <line
                key={`d-${depth}`}
                x1={x} y1={20} x2={x} y2={size.h - 20}
                stroke="#1c232c" strokeWidth="1"
              />
            );
          })}
        </g>

        {/* Depth labels */}
        {!compact && (
          <g>
            {["depth 0 · root", "depth 1", "depth 2", "depth 3"].map((label, i) => (
              <text
                key={label}
                x={depthToX(i, size.w)}
                y={size.h - 8}
                fontSize="9"
                fontFamily="var(--font-mono), ui-monospace, monospace"
                fill="#52525b"
                textAnchor="middle"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
              >
                {label}
              </text>
            ))}
          </g>
        )}

        {/* Edges */}
        <g>
          {edges.map((e) => {
            const from = lanes.find((l) => l.id === e.fromId);
            const to = lanes.find((l) => l.id === e.toId);
            if (!from || !to) return null;
            const stroke =
              e.status === "deny" ? "#ef4444" :
              e.status === "flag" ? "url(#cc-edge-flag)" :
              "url(#cc-edge-ok)";
            const dash = e.status === "deny" ? "5 5" : "0";
            const marker =
              e.status === "deny" ? "url(#cc-arrow-deny)" :
              e.status === "flag" ? "url(#cc-arrow-flag)" :
              "url(#cc-arrow-ok)";
            return (
              <g key={e.key}>
                <path
                  d={curve(from.x, from.y, to.x, to.y)}
                  stroke={stroke}
                  strokeWidth={e.status === "deny" ? 2 : 2}
                  strokeDasharray={dash}
                  fill="none"
                  markerEnd={marker}
                  style={{
                    animation: `cc-edge-draw 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                    strokeDasharray: e.status === "deny" ? "5 5" : "1000",
                    strokeDashoffset: e.status === "deny" ? 0 : 1000,
                  }}
                >
                  {e.status !== "deny" && (
                    <animate
                      attributeName="stroke-dashoffset"
                      from="1000"
                      to="0"
                      dur="600ms"
                      fill="freeze"
                    />
                  )}
                </path>
                {/* hop label */}
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 8}
                  fontSize="9"
                  fontFamily="var(--font-mono), ui-monospace, monospace"
                  fill={e.status === "deny" ? "#ef4444" : e.status === "flag" ? "#fbbf24" : "#a78bfa"}
                  textAnchor="middle"
                  style={{ letterSpacing: "0.04em" }}
                >
                  {e.action}
                </text>
              </g>
            );
          })}
        </g>

        {/* Deny burst */}
        {denyEdge && (
          <DenyBurst
            from={lanes.find((l) => l.id === denyEdge.fromId)}
            to={lanes.find((l) => l.id === denyEdge.toId)}
            rule={denyEdge.rule}
            reason={denyEdge.reason}
            layer={denyEdge.layer}
          />
        )}

        {/* Nodes */}
        <g>
          {lanes.map((l) => {
            const involved = edges.some((e) => e.fromId === l.id || e.toId === l.id);
            const blocked = denyEdge && (denyEdge.fromId === l.id || denyEdge.toId === l.id);
            return (
              <NodeChip key={l.id} lane={l} active={involved} blocked={!!blocked} compact={compact} />
            );
          })}
        </g>
      </svg>

      {/* Chain summary bar */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-500 pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="text-zinc-600">chain</span>
          <span className="text-zinc-300">{chainSummary.chainId ? chainSummary.chainId.slice(0, 8) : "—"}</span>
          {chainSummary.chainId && (
            <span className="text-zinc-600">depth {chainSummary.hopCount}</span>
          )}
        </div>
        {chainSummary.verdict && (
          <span
            className={clsx(
              chainSummary.verdict === "DENY" && "text-deny",
              chainSummary.verdict === "FLAG" && "text-warn",
              chainSummary.verdict === "ALLOW" && "text-allow",
            )}
          >
            {chainSummary.verdict}
          </span>
        )}
      </div>

      {/* Empty state */}
      {showEmpty && (
        <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div className="text-center max-w-sm">
            <div className="eyebrow text-zinc-600 mb-3">awaiting traffic</div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Run a scenario from the rail below. Hops will draw left-to-right by depth, with the verdict
              landing in the top right.
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cc-edge-draw {
          from { stroke-dashoffset: 1000; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

/* ──────────────────────────── helpers ──────────────────────────── */

function buildScene(
  events: WsEvent[],
  agents: AgentRow[],
  filterChainId: string | undefined,
  size: { w: number; h: number },
  compact: boolean,
) {
  // Place lanes: user-session at depth 0 (left); each registry agent on a
  // role-determined Y, with X derived from when (and if) it participates.
  const lanes: Lane[] = [];

  const userY = laneY(0, 4, size.h, compact);
  lanes.push({
    id: USER_ID, label: "user session", role: "user", dormant: false,
    y: userY, x: depthToX(0, size.w),
  });

  // Sort agents by role order; place at depth 1+ based on what we observe
  const orderedAgents = [...agents].sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99));
  orderedAgents.forEach((a, i) => {
    // Default x: spread across depths 1..3 based on role
    const defaultDepth =
      a.role === "coordinator" ? 1 :
      a.role === "data_fetcher" ? 2 :
      a.role === "executor" ? 3 :
      a.role === "shadow" ? 3 :
      2;
    lanes.push({
      id: a.id,
      label: a.display_name || a.id,
      role: a.role,
      dormant: !!a.is_dormant,
      y: laneY(i, orderedAgents.length, size.h, compact),
      x: depthToX(defaultDepth, size.w),
    });
  });

  // Walk events; promote lanes' x to reflect actual hop depth observed.
  let chainId: string | undefined = undefined;
  let depthMap = new Map<string, number>();
  depthMap.set(USER_ID, 0);

  const edges: Edge[] = [];
  const ruleByEdge = new Map<string, { status: "ok" | "flag" | "deny" }>();
  let denyEdge: DenyInfo | undefined;
  let verdict: "ALLOW" | "FLAG" | "DENY" | undefined;
  let hopCount = 0;

  for (const e of events) {
    if (filterChainId && "chain_id" in e && (e as { chain_id?: string }).chain_id && (e as { chain_id?: string }).chain_id !== filterChainId) continue;

    if (e.type === "delegation") {
      const d = e as DelegationEvent;
      if (!chainId) chainId = d.chain_id;
      if (filterChainId && d.chain_id !== filterChainId) continue;

      const parentDepth = depthMap.get(d.caller_id) ?? 0;
      const childDepth = parentDepth + 1;
      depthMap.set(d.callee_id, Math.max(depthMap.get(d.callee_id) ?? 0, childDepth));

      const key = `${d.caller_id}->${d.callee_id}`;
      const existing = ruleByEdge.get(key);
      edges.push({
        key,
        fromId: d.caller_id,
        toId: d.callee_id,
        status: existing?.status ?? "ok",
        hopIndex: edges.length,
        action: d.action,
        declared: d.declared_intent,
        detected: d.detected_intent,
      });
      hopCount = edges.length;
    } else if (e.type === "rule_evaluation") {
      const r = e as RuleEvaluationEvent;
      if (filterChainId && r.chain_id !== filterChainId) continue;
      if (r.result === "DENY" && r.layer === "protocol" && r.matched_segment && r.matched_segment.includes("->")) {
        const [from, to] = r.matched_segment.split("->");
        denyEdge = { fromId: from, toId: to, rule: r.rule_name, reason: r.reason, layer: r.layer };
        verdict = "DENY";
        ruleByEdge.set(`${from}->${to}`, { status: "deny" });
      } else if (r.result === "DENY") {
        verdict = "DENY";
      } else if (r.result === "FLAG" && !verdict) {
        verdict = "FLAG";
      } else if (r.result === "ALLOW" && !verdict) {
        verdict = "ALLOW";
      }
    }
  }

  // Apply rule status overrides to edges
  edges.forEach((e) => {
    const r = ruleByEdge.get(e.key);
    if (r) e.status = r.status;
  });

  // Promote lane x based on observed depth
  for (const [id, d] of depthMap.entries()) {
    const lane = lanes.find((l) => l.id === id);
    if (lane && d > 0) lane.x = depthToX(d, size.w);
  }

  // Ensure denyEdge nodes exist in lanes (e.g. shadow agent might be off-lane)
  if (denyEdge) {
    for (const id of [denyEdge.fromId, denyEdge.toId]) {
      if (!lanes.find((l) => l.id === id)) {
        const fromAgent = agents.find((a) => a.id === id);
        lanes.push({
          id,
          label: fromAgent?.display_name || id,
          role: fromAgent?.role || "shadow",
          dormant: fromAgent?.is_dormant ?? true,
          y: laneY(lanes.length, lanes.length + 1, size.h, compact),
          x: depthToX(Math.min(3, (depthMap.get(denyEdge.fromId) ?? 1) + 1), size.w),
        });
      }
    }
  }

  return {
    lanes,
    edges,
    denyEdge,
    chainSummary: {
      chainId,
      hopCount,
      verdict,
    },
  };
}

function depthToX(depth: number, w: number): number {
  if (depth === 0) return COL.user;
  const slot = Math.min(depth, 3);
  const t = (slot - 1) / 2; // 0..1 across depths 1..3
  return COL.agentMin + t * (Math.min(COL.agentMax, w - 80) - COL.agentMin);
}

function laneY(index: number, total: number, height: number, compact: boolean): number {
  const padTop = compact ? 40 : 60;
  const padBottom = compact ? 40 : 50;
  const usable = height - padTop - padBottom;
  if (total <= 1) return padTop + usable / 2;
  return padTop + (index * usable) / (total - 1);
}

function curve(x1: number, y1: number, x2: number, y2: number): string {
  const dx = (x2 - x1) * 0.45;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

/* ──────────────────────────── node chip ──────────────────────────── */

interface NodeChipProps {
  lane: Lane;
  active: boolean;
  blocked: boolean;
  compact: boolean;
}

function NodeChip({ lane, active, blocked, compact }: NodeChipProps) {
  const w = compact ? 96 : 132;
  const h = compact ? 30 : 38;
  const stroke = blocked ? "#ef4444" : lane.dormant ? "#52525b" : active ? "#a78bfa" : "#7c3aed";
  const fill = blocked ? "#241218" : lane.dormant ? "#11151b" : active ? "#15102a" : "#11151b";
  const opacity = lane.dormant && !active && !blocked ? 0.55 : 1;
  return (
    <g
      transform={`translate(${lane.x - w / 2}, ${lane.y - h / 2})`}
      style={{
        opacity,
        filter: active && !blocked ? "drop-shadow(0 0 6px rgba(167,139,250,0.45))" : "",
        transition: "opacity 320ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <rect
        width={w}
        height={h}
        fill={fill}
        stroke={stroke}
        strokeWidth="1"
        rx="0"
      />
      <text
        x={w / 2}
        y={compact ? 12 : 14}
        fontSize={compact ? 8 : 9}
        fontFamily="var(--font-mono), ui-monospace, monospace"
        fill={blocked ? "#ef4444" : lane.dormant ? "#71717a" : "#a78bfa"}
        textAnchor="middle"
        style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
      >
        {lane.role === "user" ? "user" : lane.role}
      </text>
      <text
        x={w / 2}
        y={compact ? 24 : 28}
        fontSize={compact ? 10 : 12}
        fontFamily="var(--font-sans), ui-sans-serif, system-ui, sans-serif"
        fill={blocked ? "#fca5a5" : lane.dormant ? "#a1a1aa" : "#e5e7eb"}
        textAnchor="middle"
        style={{ fontWeight: 500 }}
      >
        {truncate(lane.label, compact ? 12 : 18)}
      </text>
      {lane.dormant && (
        <text
          x={w / 2}
          y={h - 2}
          fontSize="7"
          fontFamily="var(--font-mono), ui-monospace, monospace"
          fill="#f59e0b"
          textAnchor="middle"
          style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
        >
          dormant
        </text>
      )}
    </g>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

/* ──────────────────────────── deny burst ──────────────────────────── */

interface DenyBurstProps {
  from?: Lane;
  to?: Lane;
  rule: string;
  reason: string;
  layer: "protocol" | "policy";
}

function DenyBurst({ from, to, rule, reason, layer }: DenyBurstProps) {
  if (!from || !to) return null;
  const cx = (from.x + to.x) / 2;
  const cy = (from.y + to.y) / 2;
  return (
    <g>
      <circle
        cx={cx} cy={cy} r="6" fill="none" stroke="#ef4444" strokeWidth="1.5"
      >
        <animate attributeName="r" from="6" to="56" dur="900ms" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.9" to="0" dur="900ms" repeatCount="indefinite" />
      </circle>
      <g transform={`translate(${cx}, ${cy + 22})`}>
        <rect
          x={-86} y={-12} width="172" height="42" fill="#1c0d11" stroke="#ef4444" strokeWidth="1"
        />
        <text
          x={0} y={2}
          fontSize="8"
          fontFamily="var(--font-mono), ui-monospace, monospace"
          fill="#fca5a5"
          textAnchor="middle"
          style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          layer {layer === "protocol" ? "01" : "02"} · {rule}
        </text>
        <foreignObject x={-82} y={6} width="164" height="22">
          <div
            style={{
              fontSize: "9.5px",
              lineHeight: 1.25,
              color: "#fca5a5",
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              textAlign: "center",
              padding: "0 4px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={reason}
          >
            {reason}
          </div>
        </foreignObject>
      </g>
    </g>
  );
}
