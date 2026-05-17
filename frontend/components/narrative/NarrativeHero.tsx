"use client";
import Link from "next/link";
import clsx from "clsx";
import { api } from "@/lib/api";
import { HeimdallMark } from "@/components/landing/marks/HeimdallMark";
import type { Vertical } from "@/lib/plainEnglish";
import { VERTICAL_LABEL } from "@/lib/plainEnglish";

interface Props {
  vertical: Vertical;
  setVertical: (v: Vertical) => void;
  heimdallEnabled: boolean;
  setHeimdallEnabled: (v: boolean) => void;
}

const VERTICALS: Vertical[] = ["defi", "healthcare", "customer_service"];

export function NarrativeHero({ vertical, setVertical, heimdallEnabled, setHeimdallEnabled }: Props) {
  const switchVertical = async (v: Vertical) => {
    setVertical(v);
    try { await api.switchVertical(v); } catch {}
  };

  const toggle = async () => {
    const next = !heimdallEnabled;
    setHeimdallEnabled(next);
    try { await api.toggle(next); } catch { setHeimdallEnabled(heimdallEnabled); }
  };

  return (
    <header className="card overflow-hidden mb-4">
      <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap border-b border-edge">
        <Link href="/" className="inline-flex items-center gap-3 text-bifrost hover:text-glacier transition">
          <HeimdallMark size={22} />
          <span className="font-display text-lg font-bold tracking-tight">Heimdall</span>
          <span className="font-mono text-[11px] text-zinc-600 hidden sm:inline">/dashboard</span>
        </Link>
        <button
          onClick={toggle}
          className={clsx(
            "font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 transition border",
            heimdallEnabled
              ? "border-allow/40 bg-allow/10 text-allow hover:bg-allow/20"
              : "border-deny/40 bg-deny/10 text-deny hover:bg-deny/20",
          )}
        >
          <span className={clsx("dot mr-2", heimdallEnabled ? "bg-allow" : "bg-deny")} />
          Heimdall: {heimdallEnabled ? "ON" : "OFF"}
        </button>
      </div>
      <div className="px-5 py-4 flex items-baseline justify-between gap-4 flex-wrap">
        <div className="max-w-prose">
          <h1 className="font-display text-xl md:text-2xl font-bold text-zinc-100 leading-tight">
            A guided tour through one attack you almost did not see.
          </h1>
          <p className="text-[13.5px] text-zinc-500 leading-relaxed mt-1">
            Meet the agents on the left. Watch a normal day. Watch the attack. Watch what happens
            without Heimdall. The technical panel on the right shows the rules firing live.
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 border border-edge">
          {VERTICALS.map((v) => (
            <button
              key={v}
              onClick={() => switchVertical(v)}
              className={clsx(
                "px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition",
                vertical === v
                  ? "bg-rune text-white"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-edge",
              )}
            >
              {VERTICAL_LABEL[v]}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
