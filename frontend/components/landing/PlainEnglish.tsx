import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

interface QA {
  q: string;
  a: ReactNode;
}

const QAS: QA[] = [
  {
    q: "What is an AI agent?",
    a: (
      <>
        Software that uses an AI model (ChatGPT, Gemini, Claude) to decide what to do next — and
        then actually does it. Sends emails, runs code, signs payments, updates your database. The{" "}
        <em className="not-italic text-zinc-200">decide-and-do</em> loop is what makes them agents
        rather than chatbots.
      </>
    ),
  },
  {
    q: "Why are they a security problem?",
    a: (
      <>
        Real systems use many agents that pass work to each other. A chat agent calls a search
        agent which calls a database agent which calls a payment agent. Each hop adds authority
        and loses oversight — and most attacks slip in somewhere along that chain.
      </>
    ),
  },
  {
    q: "What does Heimdall do?",
    a: (
      <>
        It sits between agents and watches every handoff. Some attacks become impossible because
        an agent literally cannot pass on authority it doesn&rsquo;t have. Everything else is
        checked against rules you write in plain YAML — for example, &ldquo;no chain longer than
        four hops can authorise a $10k payment.&rdquo;
      </>
    ),
  },
];

export function PlainEnglish() {
  return (
    <section className="border-y border-edge bg-slab/20">
      <div className="mx-auto max-w-page_wide px-6 md:px-12 py-12 md:py-16">
        <div className="flex flex-wrap items-baseline gap-3 mb-8 md:mb-10">
          <span className="font-mono text-[11px] tracking-widest uppercase text-bifrost">
            in plain english
          </span>
          <span className="text-zinc-700 font-mono">/</span>
          <span className="font-mono text-[11px] tracking-widest uppercase text-zinc-500">
            30-second primer
          </span>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {QAS.map((qa, i) => (
            <Reveal as="li" key={qa.q} delay={i * 120}>
              <h3 className="font-display text-lg md:text-xl font-semibold text-zinc-100 mb-3 leading-snug">
                {qa.q}
              </h3>
              <p className="text-[14px] text-zinc-400 leading-relaxed">{qa.a}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
