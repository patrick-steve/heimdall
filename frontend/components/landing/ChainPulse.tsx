"use client";
import { useEffect, useState } from "react";

/**
 * Self-contained, decorative-but-meaningful SVG animation that loops a
 * three-hop delegation chain. Every fifth cycle ends in a Layer 1
 * capability_attenuation block, where the would-be fourth hop is "drawn"
 * then shattered red.
 *
 * 100% SVG + CSS. No canvas, no animation library. Respects
 * prefers-reduced-motion by freezing at the first all-green frame.
 *
 * Sized to fit a 320 x 280 frame; scales with the parent.
 */

type Phase = "idle" | "hop1" | "hop2" | "hop3_ok" | "hop3_block" | "hold" | "reset";

const NODES = [
  { id: "user",   x:  50, y:  70, label: "user" },
  { id: "coord",  x: 170, y:  70, label: "coordinator" },
  { id: "data",   x: 170, y: 190, label: "data_fetcher" },
  { id: "exec",   x: 290, y: 130, label: "executor" },
  { id: "shadow", x: 290, y: 230, label: "shadow", dormant: true },
];

const EDGES: Record<string, { from: string; to: string; verdict: "ok" | "deny" }> = {
  hop1: { from: "user",  to: "coord", verdict: "ok"   },
  hop2: { from: "coord", to: "data",  verdict: "ok"   },
  hop3_ok:    { from: "coord", to: "exec",   verdict: "ok"   },
  hop3_block: { from: "data",  to: "shadow", verdict: "deny" },
};

function getNode(id: string) {
  return NODES.find((n) => n.id === id)!;
}

export function ChainPulse() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("hop3_ok");
      return;
    }
    let cancelled = false;
    const seq = async () => {
      // every fifth cycle is the attack cycle
      const attackCycle = cycle % 5 === 4;
      const steps: { p: Phase; ms: number }[] = [
        { p: "idle", ms: 600 },
        { p: "hop1", ms: 1100 },
        { p: "hop2", ms: 1100 },
        { p: attackCycle ? "hop3_block" : "hop3_ok", ms: 1500 },
        { p: "hold", ms: attackCycle ? 1900 : 1300 },
        { p: "reset", ms: 700 },
      ];
      for (const s of steps) {
        if (cancelled) return;
        setPhase(s.p);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, s.ms));
      }
      if (!cancelled) setCycle((c) => c + 1);
    };
    seq();
    return () => { cancelled = true; };
  }, [cycle]);

  const isAttackCycle = cycle % 5 === 4;

  // visible edges given phase
  const visible = (() => {
    if (phase === "idle" || phase === "reset") return [] as string[];
    if (phase === "hop1") return ["hop1"];
    if (phase === "hop2") return ["hop1", "hop2"];
    if (phase === "hop3_ok") return ["hop1", "hop2", "hop3_ok"];
    if (phase === "hop3_block") return ["hop1", "hop2", "hop3_block"];
    if (phase === "hold") return isAttackCycle ? ["hop1", "hop2", "hop3_block"] : ["hop1", "hop2", "hop3_ok"];
    return [];
  })();

  const denyVisible = phase === "hop3_block" || (phase === "hold" && isAttackCycle);

  return (
    <div className="relative h-[280px] w-full">
      <svg viewBox="0 0 340 280" className="w-full h-full block" aria-hidden>
        <defs>
          <radialGradient id="cp-bg" cx="50%" cy="40%" r="60%">
            <stop offset="0%"  stopColor="rgba(124,58,237,0.10)" />
            <stop offset="100%" stopColor="rgba(124,58,237,0)" />
          </radialGradient>
          <linearGradient id="cp-edge-ok" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0.0" />
            <stop offset="50%"  stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#cp-bg)" />

        {/* grid (very subtle) */}
        <g stroke="#1c232c" strokeWidth="1">
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 48} y1="0" x2={i * 48} y2="280" opacity="0.5" />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 48} x2="340" y2={i * 48} opacity="0.5" />
          ))}
        </g>

        {/* edges */}
        {(["hop1", "hop2", "hop3_ok", "hop3_block"] as const).map((k) => {
          const e = EDGES[k];
          const a = getNode(e.from);
          const b = getNode(e.to);
          const show = visible.includes(k);
          if (!show) return null;
          const denied = e.verdict === "deny";
          return (
            <g key={k}>
              <line
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={denied ? "#ef4444" : "url(#cp-edge-ok)"}
                strokeWidth="2"
                strokeDasharray={denied ? "5 5" : "0"}
                style={{
                  strokeDashoffset: 0,
                  opacity: denied && phase === "hold" ? 0.35 : 1,
                  transition: "opacity 320ms cubic-bezier(0.16,1,0.3,1)",
                }}
              />
              {!denied && (
                <circle
                  r="4"
                  fill="#a78bfa"
                  style={{
                    transformOrigin: `${a.x}px ${a.y}px`,
                  }}
                >
                  <animateMotion
                    dur="900ms"
                    repeatCount="1"
                    fill="freeze"
                    path={`M${a.x},${a.y} L${b.x},${b.y}`}
                  />
                  <animate attributeName="opacity" from="1" to="0" dur="900ms" fill="freeze" />
                </circle>
              )}
            </g>
          );
        })}

        {/* nodes */}
        {NODES.map((n) => {
          const active =
            (phase === "hop1" && (n.id === "user" || n.id === "coord")) ||
            (phase === "hop2" && (n.id === "coord" || n.id === "data")) ||
            (phase === "hop3_ok" && (n.id === "coord" || n.id === "exec")) ||
            (phase === "hop3_block" && (n.id === "data" || n.id === "shadow"));
          const denied = denyVisible && (n.id === "data" || n.id === "shadow");
          return (
            <g key={n.id}>
              <circle
                cx={n.x} cy={n.y} r="14"
                fill={n.dormant ? "#1c232c" : denied ? "#241218" : "#1a1325"}
                stroke={n.dormant ? "#52525b" : denied ? "#ef4444" : active ? "#a78bfa" : "#7c3aed"}
                strokeWidth="1.5"
                style={{
                  filter: active && !denied ? "drop-shadow(0 0 8px rgba(167,139,250,0.55))" : "",
                  transition: "stroke 320ms cubic-bezier(0.16,1,0.3,1), fill 320ms cubic-bezier(0.16,1,0.3,1)",
                }}
              />
              <text
                x={n.x}
                y={n.y + 28}
                fontSize="9"
                fontFamily="var(--font-mono), ui-monospace, monospace"
                fill={n.dormant ? "#52525b" : denied ? "#ef4444" : "#a1a1aa"}
                textAnchor="middle"
              >
                {n.label}
              </text>
            </g>
          );
        })}

        {/* deny burst */}
        {denyVisible && (
          <g>
            <circle cx={EDGES.hop3_block.from === "data" ? 230 : 230} cy={210} r="22" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0">
              <animate attributeName="r" from="6" to="34" dur="700ms" fill="freeze" />
              <animate attributeName="opacity" from="0.9" to="0" dur="700ms" fill="freeze" />
            </circle>
          </g>
        )}
      </svg>

      <div className="absolute top-2 left-2 right-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-600">
        <span>chain pulse · live demo</span>
        <span className={denyVisible ? "text-deny" : phase === "hop3_ok" || phase === "hold" ? "text-allow" : "text-zinc-600"}>
          {denyVisible
            ? "DENY · capability_attenuation"
            : phase === "hop3_ok"
              ? "ALLOW · depth 3"
              : phase === "hop1" || phase === "hop2"
                ? "evaluating…"
                : "idle"}
        </span>
      </div>
    </div>
  );
}
