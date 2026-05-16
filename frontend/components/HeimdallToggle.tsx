"use client";
import clsx from "clsx";
import { api } from "@/lib/api";

interface Props {
  enabled: boolean;
  onChange: (v: boolean) => void;
}

export function HeimdallToggle({ enabled, onChange }: Props) {
  return (
    <button
      onClick={async () => {
        const next = !enabled;
        onChange(next);
        await api.toggle(next).catch(() => onChange(enabled));
      }}
      className={clsx(
        "px-3 py-1.5 rounded-md border text-xs font-mono uppercase tracking-wider transition",
        enabled
          ? "border-allow/40 bg-allow/10 text-allow hover:bg-allow/20"
          : "border-deny/40 bg-deny/10 text-deny hover:bg-deny/20",
      )}
      title={enabled ? "Click to disable Heimdall (demo contrast mode)" : "Click to re-enable Heimdall"}
    >
      <span className={clsx("dot mr-2", enabled ? "bg-allow" : "bg-deny")} />
      Heimdall: {enabled ? "ON" : "OFF"}
    </button>
  );
}
