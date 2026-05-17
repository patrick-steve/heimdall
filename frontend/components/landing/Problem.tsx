import { CountUp } from "./CountUp";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

const STATS: { target: number; decimals: number; note: string; lift?: string }[] = [
  { target: 88,   decimals: 0, note: "organisations reporting confirmed or suspected agent incidents in 2026.", lift: "92.7% in healthcare." },
  { target: 63,   decimals: 0, note: "cannot enforce purpose limitations on agent behaviour." },
  { target: 24.4, decimals: 1, note: "have full visibility into which agents talk to each other." },
  { target: 21.9, decimals: 1, note: "treat agents as independent, identity-bearing entities." },
];

interface Incident {
  name: string;
  when: string;
  sector: string;
  damage: string;
  line: string;
}

const INCIDENTS: Incident[] = [
  {
    name: "Step Finance",
    when: "Jan 2026",
    sector: "DeFi · Solana",
    damage: "$27–30M moved",
    line: "AI trading agents drained 261,000+ SOL after a single device was compromised. 45.6% of DeFi teams ship shared API keys.",
  },
  {
    name: "Mexican government",
    when: "Dec 2025 → Feb 2026",
    sector: "Public sector",
    damage: "195M records",
    line: "One attacker, two off-the-shelf models, nine agencies. 220M civil records, 150 GB exfiltrated across a single chain of agent integrations.",
  },
  {
    name: "Replit autonomous agent",
    when: "Jul 2025",
    sector: "Developer tooling",
    damage: "4 production DBs wiped",
    line: "A coding agent ran a destructive migration without confirmation. The agent did exactly what its scope said it could; nobody had reviewed the scope.",
  },
  {
    name: "Anthropic agentic ops report",
    when: "Mar 2026",
    sector: "Threat intelligence",
    damage: "12 documented chains",
    line: "Reported credential exfiltration and lateral movement across cloud providers using off-the-shelf agentic assistants. The agents weren't subverted; their delegation graphs were.",
  },
  {
    name: "Healthcare BAA expiry",
    when: "Q1 2026",
    sector: "Healthcare · pattern",
    damage: "PHI exposure",
    line: "Recurring pattern: a third-party EHR adapter whose Business Associate Agreement lapsed kept its write:patient_record scope. Reactivated months later by a downstream chain.",
  },
  {
    name: "CS refund escalation",
    when: "Q4 2025",
    sector: "Retail SaaS · pattern",
    damage: "Account modification",
    line: "Recurring pattern: a customer-service bot's $50 refund authority chains into account-modification authority via a forgotten cron worker with broader scope.",
  },
];

export function Problem() {
  return (
    <Section index="01" label="PROBLEM" id="problem">
      <Reveal as="div" className="mb-12 md:mb-16 max-w-prose">
        <h2 className="display text-3xl md:text-4xl font-semibold text-zinc-100 mb-5">
          Agents aren&rsquo;t the problem.{" "}
          <span className="text-zinc-500">The handoffs between them are.</span>
        </h2>
        <p className="text-zinc-400 leading-relaxed">
          Companies are deploying agents faster than they can govern them. Across 2026 surveys the
          pattern is consistent: nobody knows what each agent is allowed to do, where that
          permission came from, or whether a five-step chain still resembles the original user
          request.
        </p>
        <p className="mt-4 text-zinc-400 leading-relaxed">
          The attacker is rarely tricking the AI model itself. They&rsquo;re exploiting the gaps
          between identities, systems, and permissions that should have expired three months ago
          and never did.
        </p>
      </Reveal>

      {/* Stats — moved up so the scale of the problem lands before the case studies. */}
      <div className="border-y border-edge mb-12 md:mb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-edge">
          {STATS.map((s, i) => (
            <Reveal key={`${s.target}-${i}`} delay={i * 80} className="p-6">
              <div className="font-mono font-medium text-zinc-100 text-4xl md:text-5xl tabular-nums tracking-tight">
                <CountUp target={s.target} decimals={s.decimals} suffix="%" duration={900} delay={i * 120} />
              </div>
              <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
                {s.note}
                {s.lift && <span className="block mt-1 text-[12px] text-warn/80 font-mono">{s.lift}</span>}
              </p>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Incident grid */}
      <Reveal as="div" className="mb-6 flex items-baseline justify-between flex-wrap gap-3">
        <h3 className="font-display text-2xl md:text-3xl font-semibold text-zinc-100">
          Six incidents. One pattern.
        </h3>
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          named breaches · sector patterns
        </span>
      </Reveal>

      <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-edge">
        {INCIDENTS.map((b, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          return (
            <Reveal
              as="li"
              key={b.name}
              delay={i * 60}
              className={[
                "p-5 border-edge transition-colors duration-300 hover:bg-edge/30",
                col > 0 ? "lg:border-l" : "",
                row > 0 ? "border-t md:border-t" : "",
                // mobile / 2-col adjustments
                i % 2 === 1 ? "md:border-l lg:border-l-0" : "",
                i % 2 === 1 ? "lg:border-l" : "",
                i >= 2 ? "md:border-t" : "",
                col > 0 ? "lg:border-t-0 lg:border-t" : "",
              ].join(" ")}
            >
              <div className="flex items-baseline justify-between gap-2 mb-3">
                <h4 className="font-display text-base font-semibold text-zinc-100">{b.name}</h4>
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 shrink-0">{b.when}</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
                <span className="eyebrow text-zinc-600">{b.sector}</span>
                <span className="font-mono text-[11px] text-deny tracking-wide">{b.damage}</span>
              </div>
              <p className="text-[12.5px] text-zinc-500 leading-relaxed">{b.line}</p>
            </Reveal>
          );
        })}
      </ol>

      <p className="mt-8 text-[13px] text-zinc-500 leading-relaxed max-w-prose">
        Two named, four sector patterns. In every case, the agents did what their scopes said they
        could. Nobody had reviewed whether those scopes still made sense, whether the chain reaching
        the executor still resembled a user request, or whether the agent on the third hop still
        belonged to the company that authorised it.
      </p>
    </Section>
  );
}
