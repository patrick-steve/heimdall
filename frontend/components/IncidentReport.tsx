"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { WsEvent } from "@/lib/types";

interface Props {
  events: WsEvent[];
  chainId: string | null;
}

export function IncidentReport({ events, chainId }: Props) {
  const [streaming, setStreaming] = useState(false);
  const [text, setText] = useState("");
  const [hasReport, setHasReport] = useState(false);

  useEffect(() => {
    // Aggregate chunks for the latest incident report from the WS stream.
    let buf = "";
    let active = false;
    for (const e of events) {
      if (e.type === "incident_report_start") { buf = ""; active = true; }
      else if (e.type === "incident_report_chunk" && active) buf += e.chunk ?? "";
      else if (e.type === "incident_report_end") { active = false; }
    }
    if (buf) { setText(buf); setHasReport(true); }
  }, [events]);

  const generate = async () => {
    if (!chainId) return;
    setStreaming(true);
    setText("");
    try {
      const res = await api.generateReport(chainId);
      if (!res.body) {
        setText(await res.text());
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setText(acc);
      }
      setHasReport(true);
    } catch (e) {
      setText(`Error generating report: ${String(e)}`);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Incident Report</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={generate}
            disabled={!chainId || streaming}
            className="text-xs px-2 py-1 rounded bg-rune/20 border border-rune text-bifrost hover:bg-rune/30 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {streaming ? "streaming…" : "generate via Gemini"}
          </button>
          {chainId && hasReport && (
            <>
              <a className="text-xs px-2 py-1 rounded bg-slab border border-edge text-zinc-300 hover:bg-edge" href={api.reportMdUrl(chainId)} download>.md</a>
              <a className="text-xs px-2 py-1 rounded bg-slab border border-edge text-zinc-300 hover:bg-edge" href={api.reportPdfUrl(chainId)} download>.pdf</a>
            </>
          )}
        </div>
      </div>
      <pre className="text-[11px] text-zinc-300 whitespace-pre-wrap max-h-72 overflow-auto font-mono leading-relaxed">
        {text || (chainId ? "Press Generate to stream a Gemini incident report." : "Select a chain (run a scenario) to enable.")}
      </pre>
    </div>
  );
}
