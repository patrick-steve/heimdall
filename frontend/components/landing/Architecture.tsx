import { AttenuationCodeBlock } from "./AttenuationCodeBlock";
import { Reveal } from "./Reveal";
import { Section } from "./Section";
import { GeminiMark } from "./marks/GeminiMark";

const LAYER1_INVARIANTS = [
  {
    name: "capability_attenuation",
    line: "Scope only shrinks across hops. A delegation that widens authority cannot be signed.",
  },
  {
    name: "tenant_isolation",
    line: "tenant_id must match parent's at every hop. Cross-tenant chains fail at construction.",
  },
  {
    name: "signed_chain_integrity",
    line: "HS256 signature per credential, parent_jti chaining. Tamper a hop, the chain dies.",
  },
];

const LAYER2_PRIMITIVES = [
  { name: "chain_pattern",     line: "Regex over caller→callee or role-serialised chain.",         arg: "match_by: role" },
  { name: "agent_state",       line: "Predicates on the registry (dormant, owner_departed, …).",  arg: "is_dormant == true" },
  { name: "chain_depth",       line: "Numeric hop ceiling.",                                       arg: "max_depth: 4" },
  { name: "value_threshold",   line: "Per-depth caps on action value.",                            arg: "depth>=4 → $1,000" },
  { name: "intent_mismatch",   line: "Lobster Trap declared vs detected, jaccard distance.",       arg: "threshold: 0.3" },
  { name: "behavioral_drift",  line: "Time-series novelty against 100 prior actions.",             arg: "min_history: 50" },
];

export function Architecture() {
  return (
    <Section index="02" label="ARCHITECTURE" id="architecture">
      <div className="grid grid-cols-12 gap-8 mb-12 md:mb-16">
        <Reveal as="div" className="col-span-12 md:col-span-7">
          <h2 className="display text-3xl md:text-4xl font-semibold text-zinc-100 mb-6">
            Two layers. One mechanism.
          </h2>
          <div className="space-y-5 text-zinc-400 leading-relaxed max-w-prose">
            <p>
              Heimdall enforces in two layers, and the distinction is the heart of the pitch.
              The protocol layer makes some attacks <em className="not-italic text-bifrost">mathematically unrepresentable</em>: an
              agent cannot pass forward authority it does not have, because the credential will not sign.
              The policy layer evaluates everything that does sign against rules expressed as YAML.
            </p>
            <p>
              Layer 1 is the architecture. Layer 2 is the configurability. Neither one is the full story
              alone; together they cover the attack surface that single-layer tools miss.
            </p>
          </div>
        </Reveal>
        <Reveal as="aside" delay={180} className="col-span-12 md:col-span-5">
          <AttenuationCodeBlock />
          <p className="mt-4 text-[12px] text-zinc-500 leading-relaxed">
            The actual error string from the demo's Scene 3. The chain is not <em className="not-italic">blocked</em> at
            a checkpoint; it is unrepresentable in the first place.
          </p>
        </Reveal>
      </div>

      {/* Layer 1 ribbon */}
      <Reveal as="div" className="layer1-wash border border-edge mb-8">
        <div className="px-6 md:px-10 py-8 md:py-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-8">
            <div className="flex items-baseline gap-4">
              <span className="font-mono text-[11px] tracking-widest uppercase text-bifrost">Layer 01</span>
              <h3 className="display text-2xl md:text-3xl font-semibold text-zinc-100">Protocol enforcement</h3>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">unrepresentable attacks</span>
          </div>
          <p className="max-w-prose text-zinc-400 leading-relaxed mb-10">
            Three invariants enforced at credential construction. They run before the policy engine sees the
            chain, and they are the reason some attacks never become attacks.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {LAYER1_INVARIANTS.map((inv, i) => (
              <Reveal
                as="li"
                key={inv.name}
                delay={120 + i * 120}
                className={`p-5 md:p-6 border-edge transition-colors duration-300 hover:bg-rune/10 ${i > 0 ? "md:border-l" : ""} ${i > 0 ? "border-t md:border-t-0" : ""}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="inline-block w-1.5 h-1.5 bg-bifrost cascade-pulse"
                    style={{ animationDelay: `${i * 0.4}s` }}
                  />
                  <span className="font-mono text-[11px] tracking-wider uppercase text-bifrost">enforced</span>
                </div>
                <h4 className="font-mono text-[14px] text-zinc-100 mb-2">{inv.name}</h4>
                <p className="text-[13px] text-zinc-500 leading-relaxed">{inv.line}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </Reveal>

      {/* Layer 2 grid */}
      <Reveal as="div" delay={120} className="border border-edge">
        <div className="px-6 md:px-10 py-8 md:py-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-8">
            <div className="flex items-baseline gap-4">
              <span className="font-mono text-[11px] tracking-widest uppercase text-zinc-500">Layer 02</span>
              <h3 className="display text-2xl md:text-3xl font-semibold text-zinc-100">Policy enforcement</h3>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">configurable as YAML</span>
          </div>
          <p className="max-w-prose text-zinc-400 leading-relaxed mb-10">
            Six rule primitives. Combine them to express any organisational policy: HIPAA minimum-necessary,
            SOC 2 logical access, EU AI Act risk proportionality, or your own. The full library lives in
            <span className="font-mono text-[12px] text-zinc-300 ml-1">policies/examples/</span>.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
            {LAYER2_PRIMITIVES.map((p, i) => {
              const col = i % 3;
              const row = Math.floor(i / 3);
              return (
                <Reveal
                  as="li"
                  key={p.name}
                  delay={i * 70}
                  className={[
                    "p-5 md:p-6 border-edge transition-colors duration-300 hover:bg-edge/50",
                    col > 0 ? "lg:border-l md:border-l" : "",
                    row > 0 ? "border-t" : "",
                  ].join(" ")}
                >
                  <h4 className="font-mono text-[14px] text-zinc-100 mb-2">{p.name}</h4>
                  <p className="text-[13px] text-zinc-500 leading-relaxed mb-3">{p.line}</p>
                  <div className="inline-flex items-baseline gap-2 border border-edge px-2 py-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">cfg</span>
                    <span className="font-mono text-[11px] text-zinc-300">{p.arg}</span>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </Reveal>

      <p className="mt-10 text-sm text-zinc-500 leading-relaxed max-w-prose">
        Every hop emits a rule card on the dashboard sidebar as it evaluates. The attack scene fires six
        violations in sequence: one Layer 1 DENY plus five Layer 2 evaluations that <em className="not-italic text-zinc-300">would have caught
        it</em> even if Layer 1 had missed. Defense in depth, made legible.
      </p>
      <p className="mt-4 text-sm text-zinc-500 leading-relaxed max-w-prose inline-flex items-center flex-wrap gap-2">
        Incident reports are streamed live by
        <span className="inline-flex items-center gap-1.5 text-zinc-300">
          <GeminiMark size={13} />
          Google Gemini
        </span>
        and downloadable as Markdown or PDF.
      </p>
    </Section>
  );
}
