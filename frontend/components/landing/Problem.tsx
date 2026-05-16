import { CountUp } from "./CountUp";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

const STATS: { target: number; decimals: number; note: string; lift?: string }[] = [
  { target: 88,   decimals: 0, note: "organisations reporting confirmed or suspected agent incidents in 2026.", lift: "92.7% in healthcare." },
  { target: 63,   decimals: 0, note: "cannot enforce purpose limitations on agent behaviour." },
  { target: 24.4, decimals: 1, note: "have full visibility into which agents talk to each other." },
  { target: 21.9, decimals: 1, note: "treat agents as independent, identity-bearing entities." },
];

const BREACHES = [
  {
    name: "Step Finance",
    when: "Jan 2026",
    sub: "DeFi · Solana",
    line: "AI trading agents moved 261,000+ SOL ($27–30M) after a single device was compromised. 45.6% of DeFi teams use shared API keys.",
  },
  {
    name: "Mexican government",
    when: "Dec 2025 → Feb 2026",
    sub: "Public sector",
    line: "One attacker, two off-the-shelf models, nine agencies. 195M taxpayer records, 220M civil records, 150 GB exfiltrated.",
  },
];

export function Problem() {
  return (
    <Section index="01" label="PROBLEM" id="problem">
      <div className="grid grid-cols-12 gap-x-8 gap-y-12 md:gap-y-16">
        <Reveal as="div" className="col-span-12 md:col-span-7">
          <h2 className="display text-3xl md:text-4xl font-semibold text-zinc-100 mb-6">
            The problem is not the agents.<br />
            <span className="text-zinc-500">It is the chain of authority connecting a chat prompt to a wallet signature.</span>
          </h2>
          <div className="space-y-5 text-zinc-400 leading-relaxed max-w-prose">
            <p>
              By overwhelming consensus across CISO surveys, analyst reports, and incidents tracked through Q1
              2026, organisations are running agents at scale while losing track of what those agents are
              authorised to do, who delegated that authority, and whether the chain still makes sense five
              hops in.
            </p>
            <p>
              The pattern is not unique to one industry. The attacker is rarely subverting the model. The
              attacker is exploiting the gap between identities, between systems, between credentials that
              should have expired three months ago and never did.
            </p>
          </div>
        </Reveal>

        <aside className="col-span-12 md:col-span-5 md:pl-6 md:border-l md:border-edge">
          <div className="space-y-10">
            {BREACHES.map((b, i) => (
              <Reveal as="article" key={b.name} delay={i * 140}>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-display text-lg font-semibold text-zinc-100">{b.name}</h3>
                  <span className="font-mono text-[11px] text-zinc-500 tracking-wide">{b.when}</span>
                </div>
                <div className="eyebrow text-zinc-600 mb-3">{b.sub}</div>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-prose">{b.line}</p>
              </Reveal>
            ))}
          </div>
        </aside>
      </div>

      <div className="mt-20 md:mt-28">
        <div className="hairline mb-10" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-6">
          {STATS.map((s, i) => (
            <Reveal key={`${s.target}-${i}`} delay={i * 80}>
              <div className="font-mono font-medium text-zinc-100 text-5xl md:text-6xl tabular-nums tracking-tight">
                <CountUp target={s.target} decimals={s.decimals} suffix="%" duration={900} delay={i * 120} />
              </div>
              <p className="mt-4 text-sm text-zinc-500 leading-relaxed max-w-[26ch]">
                {s.note}
                {s.lift && <span className="block mt-1 text-[12px] text-warn/80 font-mono">{s.lift}</span>}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
