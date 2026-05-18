"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_HEIMDALL_API ?? "http://127.0.0.1:8000";

interface Health {
  ok: boolean;
  gemini_available: boolean;
  lobster_trap_mocked: boolean;
}

type Row = { key: string; label: string; state: "live" | "mock" | "down" };

/**
 * Live status readout, polled every 8s from /api/health. Mounted on the
 * landing-page hero so the page itself behaves like a watchpost. If the
 * backend is unreachable, the panel doesn't hide — it shows "down" so the
 * visitor sees the page is honest about whether the demo is running.
 */
export function LiveStatusPanel() {
  const [rows, setRows] = useState<Row[]>([
    { key: "gemini", label: "Gemini",       state: "down" },
    { key: "lt",     label: "Lobster Trap", state: "down" },
  ]);
  const [lastTick, setLastTick] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`${API}/api/health`, { cache: "no-store" });
        const h: Health = await res.json();
        if (cancelled) return;
        setRows([
          { key: "gemini", label: "Gemini",       state: h.gemini_available ? "live" : "mock" },
          { key: "lt",     label: "Lobster Trap", state: h.lobster_trap_mocked ? "mock" : "live" },
        ]);
        setLastTick(new Date().toISOString().slice(11, 19));
      } catch {
        if (cancelled) return;
        setRows((r) => r.map((x) => ({ ...x, state: "down" })));
        setLastTick("offline");
      }
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <div className="scan border border-edge bg-slab/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="eyebrow text-zinc-500">/api/health</span>
        <span className="font-mono text-[10px] text-zinc-600">
          {lastTick ? `t = ${lastTick}` : "…"}
        </span>
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.key} className="flex items-baseline justify-between font-mono text-[13px]">
            <span className="text-zinc-300 tracking-wide">{r.label.toLowerCase()}</span>
            <span
              className={
                r.state === "live"
                  ? "text-allow"
                  : r.state === "mock"
                  ? "text-warn"
                  : "text-deny"
              }
            >
              <span className="inline-block w-2 h-2 mr-2 align-middle"
                    style={{
                      background: r.state === "live" ? "#10b981" : r.state === "mock" ? "#f59e0b" : "#ef4444",
                    }}
              />
              {r.state}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-5 pt-4 border-t border-edge">
        <p className="text-[11px] leading-relaxed text-zinc-500">
          The page polls Heimdall every 8 seconds. <span className="text-zinc-300">live</span> means the real
          subsystem is bound; <span className="text-warn">mock</span> means the local fallback is active.
          The dashboard runs identically either way.
        </p>
      </div>
    </div>
  );
}
