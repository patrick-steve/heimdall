"use client";
import { useState } from "react";
import clsx from "clsx";
import { api } from "@/lib/api";

interface Props {
  vertical: string;
  onLaunch?: (name: string) => void;
}

interface Step {
  index: string;
  name: string;
  scenario: string;
  payload?: Record<string, unknown>;
  title: string;
  body: string;
  watch: string;
  outcome: "ALLOW" | "ALLOW · tool" | "DENY · Layer 01" | "DENY → tool ran";
}

/**
 * Per-vertical step decks. Each describes the same four scenarios in
 * domain-appropriate language so the operator knows what they are
 * actually triggering.
 */
const STEPS: Record<string, Step[]> = {
  defi: [
    {
      index: "01",
      name: "Routine",
      scenario: "routine",
      title: "Run a routine portfolio check.",
      body: "Two hops: user → Portfolio Agent → Market Data Agent. No tools fire, no value moves, every rule passes.",
      watch: "Watch the right-hand sidebar fill with green ALLOW cards for both protocol invariants and all six Layer 02 primitives.",
      outcome: "ALLOW",
    },
    {
      index: "02",
      name: "Rebalance $500",
      scenario: "rebalance",
      payload: { amount_usd: 500 },
      title: "Sign a real (or mocked) Sepolia transfer.",
      body: "Three hops: Portfolio delegates to Market Data and Executor. The Executor signs a transaction. With real Sepolia credentials, it broadcasts on-chain; without, it returns a deterministic mock txhash.",
      watch: "value_threshold_by_depth evaluates $500 at depth 3 against the $10,000 cap and passes. The tx hash appears in the timeline.",
      outcome: "ALLOW · tool",
    },
    {
      index: "03",
      name: "Attack",
      scenario: "attack",
      title: "Watch the attack die at Layer 01.",
      body: "Market Data Agent pulls a poisoned external sentiment feed. It tries to delegate execute:trade scope it does not have, so the credential cannot be signed.",
      watch: "Six rule cards fire: one Layer 01 DENY plus five Layer 02 counterfactual evaluations showing what would have caught it. The would-be edge shatters with the explicit error string.",
      outcome: "DENY · Layer 01",
    },
    {
      index: "04",
      name: "Attack · Heimdall OFF",
      scenario: "attack_no_heimdall",
      title: "Same attack with no governance.",
      body: "The toggle turns Heimdall off. Credentials are forged anyway. The Executor signs and broadcasts. This is the contrast moment that frames everything else.",
      watch: "No rule cards. No shatter. A real Sepolia tx (or its mock) appears. Toggle Heimdall back on to clear state.",
      outcome: "DENY → tool ran",
    },
  ],
  healthcare: [
    {
      index: "01",
      name: "Triage",
      scenario: "routine",
      title: "Pull a patient chart through triage.",
      body: "Two hops: clinician → Triage Agent → Records Agent. The records agent fetches patient 4421's chart from the mock EHR.",
      watch: "Six policy primitives all return ALLOW. read:patient_record scope attenuates correctly into the records-only agent.",
      outcome: "ALLOW",
    },
    {
      index: "02",
      name: "Add prescription",
      scenario: "rebalance",
      payload: { dose_mg: 10 },
      title: "Write a 10 mg prescription into the chart.",
      body: "Three hops: Triage delegates to Records (read) and Update (write). The Update Agent calls the mock EHR's update_record tool. Nothing leaves the tenant boundary.",
      watch: "phi_volume_by_depth evaluates the change at depth 3 against the records-per-call cap. The EHR confirmation appears in the timeline.",
      outcome: "ALLOW · tool",
    },
    {
      index: "03",
      name: "Attack",
      scenario: "attack",
      title: "Stop a poisoned external lab feed.",
      body: "The Records agent pulls an external lab feed that's been poisoned with a directive to invoke the dormant Lab Integration vendor. It tries to delegate write:patient_record scope it does not have. Layer 01 attenuation kills the credential before the chart is touched.",
      watch: "Six rule cards fire. dormant_vendor_block flags Lab Integration; vendor_to_update_pattern matches the forbidden chain shape; phi_volume_by_depth catches the inflated request.",
      outcome: "DENY · Layer 01",
    },
    {
      index: "04",
      name: "Attack · Heimdall OFF",
      scenario: "attack_no_heimdall",
      title: "Same attack with no governance.",
      body: "Heimdall off; the credential forges through. The Update Agent calls the EHR and rewrites the chart with the poisoned content. This is what regulator-readable audit trails are meant to prevent.",
      watch: "The EHR's `[EHR: patient 4421 record updated]` log line appears. No rule cards. Toggle Heimdall back on.",
      outcome: "DENY → tool ran",
    },
  ],
  customer_service: [],
};

export function Stage({ vertical, onLaunch }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const steps = STEPS[vertical] ?? [];

  if (vertical === "customer_service" || steps.length === 0) {
    return <ConfigurationOnly vertical={vertical} />;
  }

  const launch = async (step: Step) => {
    setBusy(step.scenario);
    onLaunch?.(step.scenario);
    try {
      if (step.scenario === "attack_no_heimdall") {
        await api.toggle(false).catch(() => {});
      }
      await api.runScenario(step.scenario, step.payload ?? {});
    } catch {
      /* server already broadcasts the failure */
    } finally {
      setBusy(null);
      if (step.scenario === "attack_no_heimdall") {
        await api.toggle(true).catch(() => {});
      }
    }
  };

  const tone: Record<Step["outcome"], string> = {
    "ALLOW":            "text-allow",
    "ALLOW · tool":     "text-allow",
    "DENY · Layer 01":  "text-deny",
    "DENY → tool ran":  "text-deny",
  };

  const verticalLabel = vertical === "defi" ? "DEFI" : "HEALTHCARE";

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-edge flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-bifrost">§ DEMO · {verticalLabel}</span>
          <h3 className="font-display text-sm font-semibold tracking-tight text-zinc-100">
            Run the four-scene demo
          </h3>
        </div>
        <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider">launch in any order · scene 03 is the headline</span>
      </div>
      <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-edge">
        {steps.map((s) => (
          <li key={s.scenario} className="p-5 flex flex-col">
            <div className="flex items-baseline justify-between mb-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-bifrost">§ {s.index}</span>
              <span className={clsx("font-mono text-[10px] uppercase tracking-wider", tone[s.outcome])}>
                {s.outcome}
              </span>
            </div>
            <h4 className="font-display text-base font-semibold text-zinc-100 leading-snug mb-2">{s.title}</h4>
            <p className="text-[12px] text-zinc-500 leading-relaxed mb-3">{s.body}</p>
            <div className="mt-auto">
              <div className="eyebrow text-zinc-600 mb-2">watch for</div>
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-4">{s.watch}</p>
              <button
                type="button"
                onClick={() => launch(s)}
                disabled={!!busy}
                className={clsx(
                  "w-full font-mono text-[11px] uppercase tracking-wider px-3 py-2 transition",
                  "border",
                  busy === s.scenario
                    ? "border-bifrost text-bifrost bg-rune/15"
                    : "border-edge hover:border-rune hover:bg-rune/10 text-zinc-200",
                  busy && busy !== s.scenario && "opacity-30 cursor-not-allowed",
                )}
              >
                {busy === s.scenario ? "running…" : `▷ run · ${s.name.toLowerCase()}`}
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ────────────────────────────  CS empty state  ──────────────────────────── */

function ConfigurationOnly({ vertical }: { vertical: string }) {
  const checklist = [
    { file: "agents.yaml",   note: "four agent roles: coordinator, data_fetcher, executor, shadow. tenant ids, scopes, owners, registered_days_ago." },
    { file: "prompts.yaml",  note: "system prompts per role. shape: agents that get external content treat it with suspicion." },
    { file: "tools.py",      note: "exports TOOLS: dict[str, async callable]. routine doesn't need any; rebalance needs one executor tool; attack needs a poisoned-source tool on data_fetcher." },
    { file: "lobster_trap.yaml", note: "regex DPI rules per vertical so the proxy emits detected_intent on hostile content." },
    { file: "ScenarioPack",  note: "backend/agents/scenarios.py · add a ScenarioPack entry for this vertical with the four action verbs." },
  ];
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-edge flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-warn">§ CONFIGURATION ONLY</span>
          <h3 className="font-display text-sm font-semibold tracking-tight text-zinc-100">
            {vertical} — policy ready, runtime not wired
          </h3>
        </div>
        <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider">policy.yaml present · README provided</span>
      </div>

      <div className="px-5 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <p className="text-zinc-300 leading-relaxed mb-4 max-w-prose">
            The {vertical} vertical ships with a working <span className="font-mono text-zinc-100">policy.yaml</span>{" "}
            and a README. It is intentionally configuration-only: the rule engine is the same horizontal mechanism the DeFi
            and Healthcare verticals use, so dropping in agents, prompts, and tools is what activates this domain.
          </p>
          <p className="text-zinc-400 leading-relaxed mb-6 max-w-prose">
            This empty state is the honest signal. Heimdall does not fake scenarios it cannot run. To make this vertical
            playable, add the five artifacts on the right.
          </p>

          <div className="border border-edge p-4">
            <div className="eyebrow text-zinc-600 mb-2">what already works</div>
            <ul className="space-y-2 text-[13px] text-zinc-300">
              <li className="flex items-baseline gap-2">
                <span className="dot bg-allow mt-1.5 shrink-0" />
                six rule primitives load from <span className="font-mono text-zinc-100">verticals/{vertical}/policy.yaml</span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="dot bg-allow mt-1.5 shrink-0" />
                vertical switcher routes the dashboard through the same WebSocket and registry
              </li>
              <li className="flex items-baseline gap-2">
                <span className="dot bg-allow mt-1.5 shrink-0" />
                Lobster Trap mock proxy is shared across verticals
              </li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="eyebrow text-zinc-600 mb-3">drop these in to enable</div>
          <ol className="space-y-3">
            {checklist.map((c, i) => (
              <li key={c.file} className="border border-edge p-3">
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-bifrost">§ {String(i + 1).padStart(2, "0")}</span>
                  <span className="font-mono text-[12px] text-zinc-100">{c.file}</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{c.note}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
