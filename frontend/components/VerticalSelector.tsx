"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const LABELS: Record<string, string> = {
  defi: "DeFi",
  healthcare: "Healthcare",
  customer_service: "Customer Service",
};

export function VerticalSelector({ value, onChange }: Props) {
  const [available, setAvailable] = useState<string[]>(["defi", "healthcare", "customer_service"]);

  useEffect(() => {
    api.currentVertical()
      .then((r) => { setAvailable(r.available); onChange(r.active); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <label className="text-xs flex items-center gap-2">
      <span className="text-zinc-500 uppercase tracking-wide">Vertical</span>
      <select
        value={value}
        onChange={async (e) => {
          const v = e.target.value;
          onChange(v);
          await api.switchVertical(v).catch(() => {});
        }}
        className="bg-slab border border-edge rounded px-2 py-1 text-zinc-200"
      >
        {available.map((v) => <option key={v} value={v}>{LABELS[v] ?? v}</option>)}
      </select>
    </label>
  );
}
