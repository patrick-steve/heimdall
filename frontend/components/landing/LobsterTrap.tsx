import { Section } from "./Section";
import { LobsterTrapMark } from "./marks/LobsterTrapMark";

export function LobsterTrap() {
  return (
    <Section index="04" label="BUILT ON VEEA LOBSTER TRAP" id="lobster-trap">
      <div className="grid grid-cols-12 gap-8 items-start">
        <div className="col-span-12 md:col-span-2">
          <div className="md:sticky md:top-24 space-y-4">
            <LobsterTrapMark size={40} className="text-bifrost" />
            <div className="eyebrow text-zinc-600">Positioning</div>
          </div>
        </div>
        <div className="col-span-12 md:col-span-10">
          <blockquote className="display text-2xl md:text-3xl lg:text-4xl text-zinc-100 leading-tight font-medium max-w-[42ch]">
            Lobster Trap inspects what an agent says to the model. Heimdall tracks what agents say
            to <span className="text-bifrost">each other</span>, and what authority they carry while saying it.
          </blockquote>
          <div className="mt-10 space-y-5 max-w-prose text-zinc-400 leading-relaxed">
            <p>
              The two layers are complementary because the Step Finance class of attack crosses both. Lobster
              Trap catches prompt injection at the model boundary; Heimdall catches unauthorised delegation at
              the agent boundary, with capability attenuation ensuring some attacks are unrepresentable in the
              first place. Together, they cover the attack surface neither alone can.
            </p>
            <p className="text-zinc-500">
              Veea framed Lobster Trap as <em className="not-italic text-zinc-300">the floor, not the ceiling</em>, and listed the capabilities they
              wanted built on top: policy packs for HIPAA, SOC 2, and finance; drift monitoring; multi-agent
              permission systems; governance dashboards; enterprise security workflows. Heimdall ships working
              implementations of all five.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-4">
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
        </div>
      </div>
    </Section>
  );
}
