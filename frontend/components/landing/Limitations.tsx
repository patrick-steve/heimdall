import { Section } from "./Section";

const LIMITS = [
  {
    name: "JWT, not Biscuit",
    note: "HS256 signatures instead of capability tokens with formal scope algebra. Conceptually identical; cryptographically simpler. Upgrading is localised to backend/jwt_chain.py.",
  },
  {
    name: "Set-membership drift, not ML",
    note: "behavioral_drift flags novel delegation targets via membership. Production deployments would use embedding similarity and statistical drift over feature vectors.",
  },
  {
    name: "Single demo organisation",
    note: "Tenant isolation works at the protocol level, but the demo state contains only two tenants (the legit org and an attacker tenant for the isolation scene).",
  },
  {
    name: "Healthcare and customer service are sketches",
    note: "The mechanism is real in every vertical. Only DeFi has functional tool bindings end-to-end. Healthcare runs a mock EHR; customer service is policy YAML only.",
  },
  {
    name: "No tests, no Docker, localhost only",
    note: "Scope decisions locked in plan.md. The submission is meant to be auditable in a single afternoon, not deployable to staging.",
  },
  {
    name: "Gemini Pro is rate-limited on free tier",
    note: "Incident reports stream via gemini-flash-latest instead. The audit memo is still pulled live from the model; only the model identity is downgraded.",
  },
];

export function Limitations() {
  return (
    <Section index="05" label="HONEST LIMITATIONS" id="limitations">
      <div className="grid grid-cols-12 gap-8 mb-12">
        <div className="col-span-12 md:col-span-7">
          <h2 className="display text-3xl md:text-4xl font-semibold text-zinc-100 mb-6">
            What this is not.
          </h2>
          <p className="text-zinc-400 leading-relaxed max-w-prose">
            Trust is asymmetric: it gets earned slowly by naming what a system does <em className="not-italic text-zinc-300">not</em> do.
            Most submissions overclaim. This one does not. Every limitation below is a real seam in the
            current build, and every seam corresponds to a v2 upgrade path that the architecture already
            supports.
          </p>
        </div>
      </div>

      <ul className="border-t border-edge">
        {LIMITS.map((l) => (
          <li key={l.name} className="border-b border-edge py-6 md:py-8 grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-4">
              <h3 className="font-display text-lg md:text-xl font-semibold text-zinc-200">{l.name}</h3>
            </div>
            <div className="col-span-12 md:col-span-8">
              <p className="text-[14px] text-zinc-500 leading-relaxed max-w-prose">{l.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
