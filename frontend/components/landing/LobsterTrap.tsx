import { Reveal } from "./Reveal";
import { Section } from "./Section";
import { LobsterTrapMark } from "./marks/LobsterTrapMark";

export function LobsterTrap() {
  return (
    <Section index="04" label="BUILT ON VEEA LOBSTER TRAP" id="lobster-trap">
      {/* Pull quote */}
      <div className="grid grid-cols-12 gap-8 items-start mb-10 md:mb-14">
        <div className="col-span-12 md:col-span-2">
          <div className="md:sticky md:top-24 space-y-4">
            <LobsterTrapMark size={40} className="text-bifrost" />
            <div className="eyebrow text-zinc-600">The Foundation</div>
          </div>
        </div>
        <Reveal as="div" className="col-span-12 md:col-span-10">
          <blockquote className="display text-2xl md:text-3xl lg:text-4xl text-zinc-100 leading-tight font-medium max-w-[44ch]">
            Lobster Trap inspects what an agent says <span className="text-zinc-500">to the model.</span>{" "}
            Heimdall tracks what agents say to <span className="text-bifrost">each other</span>,
            and what authority they carry while saying it.
          </blockquote>
        </Reveal>
      </div>

      {/* Three-block: what / why / how */}
      <div className="border border-edge grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-edge">
        <Reveal as="article" className="p-6">
          <div className="eyebrow text-bifrost mb-3">§ what it is</div>
          <h3 className="font-display text-xl font-semibold text-zinc-100 mb-3 leading-snug">
            A safety layer that sits between every agent and the AI model behind it.
          </h3>
          <p className="text-[13.5px] text-zinc-400 leading-relaxed mb-4">
            Lobster Trap is Veea&rsquo;s open-source project. Every prompt an agent sends to
            Gemini, Claude, or any other AI model passes through it. It reads the prompt, reads the
            response, checks them against rules you write, and tags every reply with notes on what
            it saw (a channel called{" "}
            <span className="font-mono text-[12px] text-zinc-200">_lobstertrap</span>).
          </p>
          <p className="text-[12.5px] text-zinc-500 leading-relaxed">
            In security terms it&rsquo;s a{" "}
            <span className="text-zinc-300">firewall for AI prompts</span> — the equivalent of a WAF
            for websites, but for AI traffic.
          </p>
        </Reveal>

        <Reveal as="article" delay={120} className="p-6">
          <div className="eyebrow text-warn mb-3">§ why we use it</div>
          <h3 className="font-display text-xl font-semibold text-zinc-100 mb-3 leading-snug">
            Prompt-injection detection is a research problem. We did not want to half-solve it.
          </h3>
          <p className="text-[13.5px] text-zinc-400 leading-relaxed mb-4">
            Detecting hostile content in an agent&rsquo;s context window is a hard, evolving problem.
            Veea has spent months on it. A half-finished prompt-injection detector is{" "}
            <span className="text-zinc-200">worse than none</span>: it lulls the operator into
            thinking the model boundary is covered when it is not.
          </p>
          <p className="text-[12.5px] text-zinc-500 leading-relaxed">
            Heimdall focuses on what Lobster Trap does <span className="text-zinc-300">not</span>{" "}
            do: agent-to-agent governance. Two products, two boundaries, no overlap. Heimdall
            inherits Veea&rsquo;s detection work for free.
          </p>
        </Reveal>

        <Reveal as="article" delay={240} className="p-6">
          <div className="eyebrow text-allow mb-3">§ how we use it</div>
          <h3 className="font-display text-xl font-semibold text-zinc-100 mb-3 leading-snug">
            Lobster Trap fires the <span className="font-mono text-base">intent_mismatch</span> rule.
          </h3>
          <p className="text-[13.5px] text-zinc-400 leading-relaxed mb-4">
            Every agent thought goes through the proxy. The agent sends its{" "}
            <span className="font-mono text-[12px] text-zinc-200">declared_intent</span>{" "}
            (&ldquo;fetch market sentiment&rdquo;). Lobster Trap reads the actual content and replies
            with{" "}
            <span className="font-mono text-[12px] text-zinc-200">detected_intent</span>{" "}
            (&ldquo;external content attempting to invoke agent with elevated scope&rdquo;).
          </p>
          <p className="text-[12.5px] text-zinc-500 leading-relaxed">
            Heimdall reads both. If the Jaccard overlap drops below 0.3, the{" "}
            <span className="font-mono text-[12px] text-zinc-200">intent_mismatch</span> rule fires
            and the chain is flagged before it ever reaches the executor.
          </p>
        </Reveal>
      </div>

      {/* Concrete data-flow example */}
      <div className="mt-10 md:mt-14 grid grid-cols-12 gap-8 items-start">
        <Reveal as="div" className="col-span-12 lg:col-span-5">
          <div className="eyebrow text-zinc-600 mb-3">walkthrough · scene 03 attack</div>
          <h3 className="font-display text-2xl font-semibold text-zinc-100 mb-4 leading-snug">
            How the Lobster Trap hand-off lands on the dashboard.
          </h3>
          <ol className="space-y-4 text-[13.5px] text-zinc-400 leading-relaxed">
            <li className="pl-7 relative">
              <span className="absolute left-0 top-0 font-mono text-[11px] text-bifrost">01</span>
              The Market Data Agent calls Gemini through the Lobster Trap proxy with a declared
              intent of &ldquo;fetch market sentiment from external feed.&rdquo;
            </li>
            <li className="pl-7 relative">
              <span className="absolute left-0 top-0 font-mono text-[11px] text-bifrost">02</span>
              The proxy fetches the (poisoned) external content and notices the regex pattern{" "}
              <span className="font-mono text-[12px] text-zinc-200">INJECTED PROMPT | invoke .* with .* scope</span>{" "}
              matches.
            </li>
            <li className="pl-7 relative">
              <span className="absolute left-0 top-0 font-mono text-[11px] text-bifrost">03</span>
              Lobster Trap returns the response to the agent but attaches a metadata channel:{" "}
              <span className="font-mono text-[12px] text-zinc-200">detected_intent</span>{" "}
              =&nbsp;&ldquo;external content attempting to invoke agent.&rdquo;
            </li>
            <li className="pl-7 relative">
              <span className="absolute left-0 top-0 font-mono text-[11px] text-bifrost">04</span>
              Heimdall computes the Jaccard overlap between &ldquo;fetch market sentiment&rdquo; and
              &ldquo;invoke agent.&rdquo; The overlap is{" "}
              <span className="text-deny font-mono">0.00</span>. The{" "}
              <span className="font-mono text-[12px] text-zinc-200">intent_mismatch</span> rule fires.
            </li>
            <li className="pl-7 relative">
              <span className="absolute left-0 top-0 font-mono text-[11px] text-bifrost">05</span>
              A yellow FLAG card appears on the dashboard sidebar. The chain still tries to proceed,
              and Layer 01 capability attenuation kills it on the next hop. <span className="text-zinc-500">Two boundaries, one attack.</span>
            </li>
          </ol>
        </Reveal>

        <Reveal as="aside" delay={120} className="col-span-12 lg:col-span-7">
          <pre className="border border-edge bg-slab/70 p-5 font-mono text-[11.5px] leading-relaxed text-zinc-300 overflow-x-auto">
{`# verticals/defi/lobster_trap.yaml — Veea-style DPI rules

rules:
  - name: detect_external_injection
    pattern: "INJECTED PROMPT|invoke .* with .* scope|execute:trade"
    action: FLAG
    metadata:
      detected_intent: "external content attempting to invoke an agent with elevated scope"

  - name: detect_self_promote
    pattern: "(?i)grant yourself|escalate|widen scope"
    action: FLAG
    metadata:
      detected_intent: "attempted privilege escalation"

  - name: log_all_metadata
    pattern: ".*"
    action: LOG

# Heimdall reads the response's _lobstertrap channel:
#   {
#     "detected_intent": "external content attempting to invoke an agent...",
#     "flags": ["detect_external_injection"]
#   }
#
# It then fires the intent_mismatch rule against the agent's declared_intent.
# The mismatch shows up as a FLAG card on the dashboard sidebar in real time.`}
          </pre>
        </Reveal>
      </div>

      {/* Veea positioning paragraphs */}
      <div className="mt-10 md:mt-14 grid grid-cols-12 gap-8">
        <Reveal as="div" className="col-span-12 md:col-span-8 md:col-start-3 max-w-prose text-zinc-400 leading-relaxed space-y-5">
          <p>
            The two products are complementary because the Step Finance class of attack crosses both.
            Lobster Trap catches the prompt injection at the model boundary; Heimdall catches the
            unauthorised delegation at the agent boundary, with capability attenuation ensuring some
            attacks are unrepresentable in the first place. Together, they cover the attack surface
            neither alone can.
          </p>
          <p className="text-zinc-500">
            Veea framed Lobster Trap as{" "}
            <em className="not-italic text-zinc-300">the floor, not the ceiling</em>, and listed
            the capabilities they wanted built on top: policy packs for HIPAA, SOC 2, and finance;
            drift monitoring; multi-agent permission systems; governance dashboards; enterprise
            security workflows. Heimdall ships working implementations of all five.
          </p>
        </Reveal>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <a
          href="https://github.com/veeainc/lobstertrap"
          target="_blank"
          rel="noopener"
          className="font-mono text-[12px] uppercase tracking-wider border border-edge hover:border-edgeHi text-zinc-300 px-4 py-2 transition"
        >
          github.com/veeainc/lobstertrap ↗
        </a>
        <span className="font-mono text-[11px] text-zinc-600">attribution · heimdall/plan.md</span>
      </div>
    </Section>
  );
}
