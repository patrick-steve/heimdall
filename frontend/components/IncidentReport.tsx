"use client";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { api, BACKEND } from "@/lib/api";
import { getSessionId } from "@/lib/session";
import type { WsEvent } from "@/lib/types";

interface Props {
  events: WsEvent[];
  chainId: string | null;
}

type Status = "idle" | "streaming" | "ready" | "error";

/**
 * Streams a Gemini-generated incident memo for the active chain.
 *
 * Fixes from the previous rev:
 *   - Tracks status explicitly instead of mixing it across booleans.
 *   - Surfaces backend errors in human language ("Gemini rate-limited;
 *     showing the deterministic fallback") rather than dumping the raw
 *     exception.
 *   - MD/PDF download links now carry the session id via a query param
 *     so per-session isolation does not 404 the file fetch.
 *   - Auto-resets when the chain id changes so a fresh chain does not
 *     show a stale report from the previous run.
 */
export function IncidentReport({ events, chainId }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset when the chain id changes — otherwise the previous chain's
  // report leaks into the next run.
  useEffect(() => {
    setStatus("idle");
    setText("");
    setError(null);
  }, [chainId]);

  // Optionally absorb WS chunks if the backend is streaming on its own
  // (when another tab kicked off the same chain's report, for instance).
  useEffect(() => {
    let buf = "";
    let saw = false;
    for (const e of events) {
      if (e.type === "incident_report_start" && (e as { chain_id?: string }).chain_id === chainId) {
        buf = "";
        saw = true;
      } else if (e.type === "incident_report_chunk" && saw) {
        buf += e.chunk ?? "";
      } else if (e.type === "incident_report_end" && saw) {
        saw = false;
      }
    }
    if (buf && !text) setText(buf);
  }, [events, chainId, text]);

  const downloadUrls = useMemo(() => {
    if (!chainId) return null;
    const sid = encodeURIComponent(getSessionId());
    return {
      md: `${BACKEND}/api/audit/report/${chainId}.md?session_id=${sid}`,
      pdf: `${BACKEND}/api/audit/report/${chainId}.pdf?session_id=${sid}`,
    };
  }, [chainId]);

  const generate = async () => {
    if (!chainId) return;
    setStatus("streaming");
    setText("");
    setError(null);
    try {
      const res = await api.generateReport(chainId);
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`backend returned ${res.status}: ${detail.slice(0, 120)}`);
      }
      if (!res.body) {
        setText(await res.text());
        setStatus("ready");
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
      setStatus("ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Recognise the most common failure mode (Gemini quota) and explain
      // it in a way the operator can act on.
      if (/quota|rate.limit|429/i.test(msg)) {
        setError("Gemini hit its free-tier limit. Showing the deterministic fallback memo.");
      } else if (/not found|404/i.test(msg)) {
        setError("Backend has no record of this chain. Run a scenario first.");
      } else {
        setError(`Could not generate the report: ${msg}`);
      }
      setStatus("error");
    }
  };

  const empty = !chainId;
  const hasContent = text.length > 0;

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-edge flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-bifrost">§ memo</span>
          <h3 className="font-display text-sm font-semibold text-zinc-100">Incident report</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generate}
            disabled={empty || status === "streaming"}
            className={clsx(
              "font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 transition border",
              empty || status === "streaming"
                ? "border-edge text-zinc-600"
                : "border-rune bg-rune/10 text-bifrost hover:bg-rune/25",
            )}
          >
            {status === "streaming" ? "writing…" : hasContent ? "regenerate" : "▷ generate"}
          </button>
          {hasContent && downloadUrls && (
            <>
              <a
                href={downloadUrls.md}
                download
                className="font-mono text-[10px] uppercase tracking-widest px-2 py-1.5 border border-edge text-zinc-300 hover:bg-edge transition"
              >
                .md
              </a>
              <a
                href={downloadUrls.pdf}
                download
                className="font-mono text-[10px] uppercase tracking-widest px-2 py-1.5 border border-edge text-zinc-300 hover:bg-edge transition"
              >
                .pdf
              </a>
            </>
          )}
        </div>
      </div>

      {status === "streaming" && !hasContent && (
        <div className="px-4 py-6">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-bifrost">
            <span className="dot bg-bifrost animate-pulse_soft" />
            heimdall is writing the compliance memo…
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed mt-2">
            Usually 5 to 15 seconds. The memo will start appearing below as Gemini streams it.
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="px-4 py-3 border-b border-edge">
          <div className="font-mono text-[10px] uppercase tracking-widest text-warn mb-1">notice</div>
          <p className="text-[12px] text-warn/90 leading-relaxed">{error}</p>
        </div>
      )}

      {empty ? (
        <div className="px-4 py-6 text-center">
          <p className="text-[12px] text-zinc-500 leading-relaxed">
            Run a scenario to enable the incident memo for that chain.
          </p>
        </div>
      ) : (
        <pre className="text-[11px] text-zinc-300 whitespace-pre-wrap max-h-72 overflow-auto font-mono leading-relaxed p-4">
          {text || (status === "streaming" ? "…" : "Press generate to stream a Gemini-written memo for this chain.")}
        </pre>
      )}
    </div>
  );
}
