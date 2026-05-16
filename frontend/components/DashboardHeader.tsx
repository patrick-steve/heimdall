"use client";
import clsx from "clsx";
import Link from "next/link";
import { HeimdallMark } from "@/components/landing/marks/HeimdallMark";
import { HeimdallToggle } from "@/components/HeimdallToggle";
import { VerticalSelector } from "@/components/VerticalSelector";

interface Props {
  vertical: string;
  setVertical: (v: string) => void;
  heimdallEnabled: boolean;
  setHeimdallEnabled: (v: boolean) => void;
  health: {
    gemini: "live" | "mock" | "down";
    lobster: "live" | "mock" | "down";
    sepolia: "live" | "mock" | "down";
  };
  activeChainId: string | null;
  chainDepth: number;
  verdict: "ALLOW" | "FLAG" | "DENY" | null;
}

const STATE_COLOR: Record<"live" | "mock" | "down", string> = {
  live: "text-allow",
  mock: "text-warn",
  down: "text-deny",
};

export function DashboardHeader({
  vertical,
  setVertical,
  heimdallEnabled,
  setHeimdallEnabled,
  health,
  activeChainId,
  chainDepth,
  verdict,
}: Props) {
  return (
    <header className="card mb-3 overflow-hidden">
      <div className="px-5 py-3 grid grid-cols-12 gap-4 items-center border-b border-edge">
        {/* Brand + route */}
        <div className="col-span-12 lg:col-span-3 flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-bifrost hover:text-glacier transition-colors duration-150">
            <HeimdallMark size={20} />
            <span className="font-display text-lg font-bold tracking-tight">Heimdall</span>
          </Link>
          <span className="font-mono text-[11px] text-zinc-600">/dashboard</span>
        </div>

        {/* Vertical + toggle */}
        <div className="col-span-12 lg:col-span-5 flex flex-wrap items-center justify-center gap-3">
          <VerticalSelector value={vertical} onChange={setVertical} />
          <HeimdallToggle enabled={heimdallEnabled} onChange={setHeimdallEnabled} />
        </div>

        {/* Chain status */}
        <div className="col-span-12 lg:col-span-4 flex items-center justify-end gap-5 font-mono text-[10px] uppercase tracking-widest">
          <span className="flex items-center gap-2 text-zinc-500">
            <span className="text-zinc-600">chain</span>
            <span className="text-zinc-300">{activeChainId ? activeChainId.slice(0, 8) : "—"}</span>
          </span>
          <span className="flex items-center gap-2 text-zinc-500">
            <span className="text-zinc-600">depth</span>
            <span className="text-zinc-300">{chainDepth || 0}</span>
          </span>
          <span
            className={clsx(
              "flex items-center gap-2",
              verdict === "ALLOW" && "text-allow",
              verdict === "FLAG" && "text-warn",
              verdict === "DENY" && "text-deny",
              !verdict && "text-zinc-600",
            )}
          >
            <span className={clsx(
              "dot",
              verdict === "ALLOW" && "bg-allow",
              verdict === "FLAG" && "bg-warn",
              verdict === "DENY" && "bg-deny",
              !verdict && "bg-zinc-600",
            )} />
            {verdict ?? "idle"}
          </span>
        </div>
      </div>

      {/* Subsystem health strip */}
      <div className="px-5 py-2 flex flex-wrap items-center justify-between gap-y-2 gap-x-6 bg-slab/40">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-[10px] uppercase tracking-widest">
          {(["gemini", "lobster", "sepolia"] as const).map((k) => (
            <span key={k} className="flex items-center gap-2 text-zinc-600">
              <span className={clsx(
                "dot",
                health[k] === "live" && "bg-allow",
                health[k] === "mock" && "bg-warn",
                health[k] === "down" && "bg-deny",
              )} />
              <span>{k === "lobster" ? "lobster trap" : k}</span>
              <span className={STATE_COLOR[health[k]]}>{health[k]}</span>
            </span>
          ))}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          ws · <span className="text-allow">connected</span>
        </div>
      </div>
    </header>
  );
}
