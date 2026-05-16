import { Reveal } from "./Reveal";
import { Section } from "./Section";

interface Vertical {
  index: string;
  name: string;
  status: "full" | "sketch" | "yaml-only";
  tagline: string;
  beats: string[];
  rules: string[];
}

const VERTICALS: Vertical[] = [
  {
    index: "01",
    name: "DeFi",
    status: "full",
    tagline: "Four agents, one Sepolia wallet, $30M of unrepresentable attack.",
    beats: [
      "Portfolio Agent rebalances via Market Data + Executor on a 3-hop chain.",
      "Executor signs and broadcasts a real Sepolia transfer with on-chain receipt.",
      "Attack scene: poisoned external sentiment, Layer 1 capability attenuation kills the chain.",
    ],
    rules: ["shadow_to_executor_pattern", "value_threshold_by_depth", "behavioral_drift"],
  },
  {
    index: "02",
    name: "Healthcare",
    status: "sketch",
    tagline: "Same engine, different domain: PHI access, BAA expiry, dormant vendor integrations.",
    beats: [
      "Triage, Records, Update, and a dormant Lab Integration vendor whose contract ended.",
      "Mock EHR tool, healthcare-specific Lobster Trap rules for PHI detection.",
      "Vertical-switcher demo lands the platform claim: same Heimdall, new tenant ID space.",
    ],
    rules: ["dormant_vendor_block", "phi_volume_by_depth", "vendor_to_update_pattern"],
  },
  {
    index: "03",
    name: "Customer service",
    status: "yaml-only",
    tagline: "Policy without code: prove the engine is configurable, not bound to a stack.",
    beats: [
      "Six-primitive policy pack ready to load. No agents.yaml, no tools.py needed.",
      "Refund caps that shrink with chain depth — the inverse of an IAM escalation pattern.",
      "An integrator's reference for plugging Heimdall into an existing CRM.",
    ],
    rules: ["refund_amount_by_depth", "bot_to_executor_pattern", "declared_intent_check"],
  },
];

function statusLabel(s: Vertical["status"]) {
  switch (s) {
    case "full":      return { copy: "full vertical",  tone: "text-allow" };
    case "sketch":    return { copy: "sketched",       tone: "text-warn" };
    case "yaml-only": return { copy: "yaml-only",      tone: "text-zinc-500" };
  }
}

export function Verticals() {
  return (
    <Section index="03" label="VERTICALS" id="verticals">
      <div className="grid grid-cols-12 gap-8 mb-16 md:mb-24">
        <div className="col-span-12 md:col-span-6">
          <h2 className="display text-3xl md:text-4xl font-semibold text-zinc-100 mb-6">
            Same engine.<br />
            <span className="text-zinc-500">Three domains, one switcher.</span>
          </h2>
        </div>
        <div className="col-span-12 md:col-span-6 md:pt-3">
          <p className="text-zinc-400 leading-relaxed max-w-prose">
            Heimdall is horizontal because the engine is generic. Agents, prompts, tools, and policy are
            vertical YAML; the protocol enforcement and the policy primitives are not. The DeFi vertical is
            built end-to-end; healthcare proves the same architecture re-skins cleanly; customer service is
            the integrator's empty template.
          </p>
        </div>
      </div>

      <ol className="border-t border-edge">
        {VERTICALS.map((v, i) => {
          const s = statusLabel(v.status);
          return (
            <Reveal as="li" key={v.name} delay={i * 120} className="border-b border-edge group vrow">
              <div className="grid grid-cols-12 gap-6 py-10 md:py-14 transition-colors duration-300 group-hover:bg-slab/40 px-4 md:px-6 -mx-4 md:-mx-6">
                <div className="col-span-12 md:col-span-3">
                  <div className="flex items-baseline gap-4 md:flex-col md:gap-2">
                    <span className="font-mono text-[11px] tracking-widest uppercase text-bifrost">§ {v.index}</span>
                    <h3 className="display text-3xl md:text-4xl font-semibold text-zinc-100">{v.name}</h3>
                  </div>
                  <div className={`mt-2 font-mono text-[11px] uppercase tracking-wider ${s.tone}`}>{s.copy}</div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <p className="text-lg text-zinc-300 leading-snug mb-5 max-w-prose">{v.tagline}</p>
                  <ul className="space-y-2 max-w-prose">
                    {v.beats.map((b) => (
                      <li key={b} className="text-[13px] text-zinc-500 leading-relaxed pl-4 relative">
                        <span className="absolute left-0 top-2 w-1.5 h-1.5 bg-zinc-700" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="col-span-12 md:col-span-3">
                  <div className="eyebrow mb-3 text-zinc-600">rules that fire</div>
                  <div className="flex flex-wrap gap-1.5">
                    {v.rules.map((r) => (
                      <span
                        key={r}
                        className="font-mono text-[11px] text-zinc-300 border border-edge px-2 py-1"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {i === VERTICALS.length - 1 && null}
            </Reveal>
          );
        })}
      </ol>
    </Section>
  );
}
