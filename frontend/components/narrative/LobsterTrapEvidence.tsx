"use client";
import { useMemo } from "react";
import clsx from "clsx";
import type { DelegationEvent, ExternalContentEvent, WsEvent } from "@/lib/types";

interface Props {
  events: WsEvent[];
  chainId: string | null;
}

/**
 * Side-by-side DPI evidence card for Lobster Trap.
 *
 * Only renders when the active chain saw an `external_content_flagged`
 * event (i.e. the attack scenarios). Surfaces:
 *
 *   - declared_intent (what the agent said it was doing)
 *   - detected_intent (what the proxy's DPI rules saw)
 *   - matched rule name + intent_category + risk score
 *   - the raw poisoned content, truncated
 *   - a LIVE / MOCK badge depending on whether LOBSTER_TRAP_URL was set
 *     on the backend at the time the event fired
 *
 * If no external_content event for the chain is present, returns null —
 * routine and rebalance scenarios collapse cleanly.
 */
export function LobsterTrapEvidence({ events, chainId }: Props) {
  const ev = useMemo<ExternalContentEvent | null>(() => {
    if (!chainId) return null;
    let latest: ExternalContentEvent | null = null;
    for (const e of events) {
      if (e.type === "external_content_flagged" && e.chain_id === chainId) {
        latest = e as ExternalContentEvent;
      }
    }
    return latest;
  }, [events, chainId]);

  // Cross-reference: the attack hop's delegation event carries the
  // declared/detected pair used by the intent_mismatch rule. Falls back to
  // the external_content_flagged event's own values when absent.
  const attackHop = useMemo<DelegationEvent | null>(() => {
    if (!chainId) return null;
    let last: DelegationEvent | null = null;
    for (const e of events) {
      if (e.type === "delegation" && e.chain_id === chainId && e.detected_intent) {
        last = e as DelegationEvent;
      }
    }
    return last;
  }, [events, chainId]);

  if (!ev) return null;

  const declared = ev.declared_intent ?? attackHop?.declared_intent ?? "—";
  const detected =
    ev.detected_intent ??
    attackHop?.detected_intent ??
    ev.sentiment?.sentiment_text ??
    "—";

  const matchedRule = ev.matched_rule || ev.mismatches?.[0]?.field || null;
  const riskScore = typeof ev.risk_score === "number" ? ev.risk_score : null;
  const isMocked = ev.lobster_trap_mocked ?? true;
  const raw = ev.raw_content || ev.sentiment?.sentiment_text || "";

  return (
    <div className="border-t border-edge px-5 py-4 bg-slab/40">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-bifrost">
            § DPI · Lobster Trap
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            ingress inspection
          </span>
        </div>
        <span
          className={clsx(
            "font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border",
            isMocked
              ? "border-warn/40 text-warn"
              : "border-allow/40 text-allow",
          )}
          title={
            isMocked
              ? "LOBSTER_TRAP_URL is unset on the backend — DPI is simulated locally with the same regex rules the proxy uses."
              : "LOBSTER_TRAP_URL is bound — the real Veea proxy is in the data path between agents and Gemini."
          }
        >
          {isMocked ? "Mock" : "Live"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Side
          eyebrow="declared intent"
          eyebrowTone="text-zinc-500"
          body={declared}
          bodyTone="text-zinc-200"
        />
        <Side
          eyebrow="detected intent"
          eyebrowTone="text-deny"
          body={detected}
          bodyTone="text-deny"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        {matchedRule && (
          <span>
            matched · <span className="text-zinc-300">{matchedRule}</span>
          </span>
        )}
        {ev.intent_category && (
          <span>
            category · <span className="text-zinc-300">{ev.intent_category}</span>
          </span>
        )}
        {riskScore !== null && (
          <span>
            risk · <span className={clsx(riskScore >= 0.6 ? "text-deny" : "text-zinc-300")}>
              {riskScore.toFixed(2)}
            </span>
          </span>
        )}
        {ev.contains_injection && (
          <span className="text-warn">injection pattern</span>
        )}
      </div>

      {raw && (
        <details className="mt-4 group">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors">
            raw external content ↓
          </summary>
          <pre className="mt-3 bg-ink border border-edge px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-400 overflow-x-auto whitespace-pre-wrap break-words">
            {raw.slice(0, 600)}
            {raw.length > 600 ? "…" : ""}
          </pre>
        </details>
      )}

      {isMocked && (
        <p className="mt-3 text-[11px] text-zinc-500 leading-relaxed">
          Set <span className="font-mono text-zinc-300">LOBSTER_TRAP_URL</span> on the backend to
          route through the real Veea binary; the DPI rules are identical either way.
        </p>
      )}
    </div>
  );
}

function Side({
  eyebrow,
  eyebrowTone,
  body,
  bodyTone,
}: {
  eyebrow: string;
  eyebrowTone: string;
  body: string;
  bodyTone: string;
}) {
  return (
    <div>
      <div className={clsx("font-mono text-[10px] uppercase tracking-widest mb-2", eyebrowTone)}>
        {eyebrow}
      </div>
      <p className={clsx("text-[13.5px] leading-snug", bodyTone)}>"{body}"</p>
    </div>
  );
}
