import { Reveal } from "./Reveal";
import { Section } from "./Section";

interface Item {
  tag: string;
  tagTone: "bifrost" | "warn" | "zinc";
  title: string;
  body: string;
  leans_on: string;
}

const ITEMS: Item[] = [
  {
    tag: "next",
    tagTone: "bifrost",
    title: "Plain-English → YAML",
    body:
      "An operator types ‘block any chain that hands invoice scope to a non-finance agent’ and Heimdall emits a candidate rule against the six primitives. The same Gemini pipeline that writes the incident memos already turns chain data into prose; we point it the other way.",
    leans_on:
      "uses · backend/policy_engine.py · the existing incident-report streamer",
  },
  {
    tag: "next",
    tagTone: "bifrost",
    title: "Dry-run against the chain ledger",
    body:
      "Before a candidate rule reaches the live engine, replay the last N days of real chains against it. The dashboard surfaces the diff: ‘this rule would have allowed 1,204 chains, flagged 38, denied 6. Two of the six were the attack scene from last Tuesday.’ No bad DENY ever wedges production traffic.",
    leans_on:
      "uses · backend/endpoints/replay.py · chain_credentials ledger",
  },
  {
    tag: "exploring",
    tagTone: "warn",
    title: "Traffic-mined rule suggestions",
    body:
      "Run Heimdall in shadow for a week, cluster the chains the gateway actually saw, and surface the gaps: ‘you’ve never had research → payment in 47k chains — should that be a DENY?’ The bold version of automation; less a feature, more a research roll.",
    leans_on:
      "uses · agent_behavior_baseline · novel-chain detection from behavioral_drift",
  },
];

const TAG_TONE: Record<Item["tagTone"], string> = {
  bifrost: "text-bifrost border-bifrost/40",
  warn: "text-warn border-warn/40",
  zinc: "text-zinc-400 border-edge",
};

export function Roadmap() {
  return (
    <Section index="07" label="ROADMAP" id="roadmap">
      <Reveal as="div" className="mb-10 md:mb-14 max-w-prose">
        <h2 className="display text-3xl md:text-4xl font-semibold text-zinc-100 mb-5">
          The rules write themselves <span className="text-zinc-500">next.</span>
        </h2>
        <p className="text-zinc-400 leading-relaxed">
          Today an operator authors YAML. v0.1 ships the six primitives that make that authoring
          tractable. The next milestone is{" "}
          <span className="text-zinc-200">closing the loop between the chain ledger and the policy file</span>
          {" "}— so rules can be drafted in plain English, dry-run against real history, or proposed
          from traffic the gateway has already seen.
        </p>
      </Reveal>

      <ol className="border border-edge grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-edge">
        {ITEMS.map((item, i) => (
          <Reveal as="li" key={item.title} delay={i * 120} className="p-6 md:p-7 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <span
                className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border ${TAG_TONE[item.tagTone]}`}
              >
                {item.tag}
              </span>
              <span className="font-mono text-[11px] tracking-widest uppercase text-zinc-600">
                § {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="font-display text-lg md:text-xl font-semibold text-zinc-100 mb-3 leading-snug">
              {item.title}
            </h3>
            <p className="text-[13.5px] text-zinc-400 leading-relaxed mb-5 flex-1">{item.body}</p>
            <p className="font-mono text-[11px] text-zinc-600 leading-relaxed border-t border-edge pt-4">
              {item.leans_on}
            </p>
          </Reveal>
        ))}
      </ol>

      <div className="mt-10 md:mt-14 grid grid-cols-12 gap-8">
        <Reveal as="div" className="col-span-12 md:col-span-8 md:col-start-3 max-w-prose text-zinc-500 leading-relaxed text-[14px]">
          <p>
            None of the three is a new product — each one stretches an existing piece of the
            backend. The chain ledger, the policy engine, and the behavioural baseline already
            store everything required; the v0.2 work is{" "}
            <span className="text-zinc-300">teaching them to talk to each other</span> through a
            single authoring surface.
          </p>
        </Reveal>
      </div>
    </Section>
  );
}
