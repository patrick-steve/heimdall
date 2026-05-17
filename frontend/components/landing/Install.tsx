import { Reveal } from "./Reveal";
import { Section } from "./Section";

interface Step {
  n: string;
  title: string;
  cmd: string;
  note: string;
}

const STEPS: Step[] = [
  {
    n: "01",
    title: "Clone + bring it up",
    cmd: "git clone https://github.com/patrick-steve/heimdall\ncd heimdall\ndocker compose up",
    note: "Backend at :8000, dashboard at :3000. Demo API key prints in the backend logs on first boot, between two ‘===’ banners.",
  },
  {
    n: "02",
    title: "Install the SDK",
    cmd: "pip install heimdall-sdk\n# or\nnpm install @heimdall/sdk",
    note: "Python 3.10+ or Node 18+. Both ship with the same surface; pick the one that fits your runtime.",
  },
  {
    n: "03",
    title: "Authorise a delegation",
    cmd: `from heimdall import Heimdall

hd = Heimdall(api_key="hd_test_...", base_url="http://localhost:8000")
result = hd.delegate(
    from_agent="research_agent",
    to_agent="payment_agent",
    action="payment:send",
    capabilities=["payment:send"],
)
if result.denied:
    print("blocked by", result.rule, "—", result.reason)`,
    note: "If the parent agent doesn’t carry payment:send, Heimdall refuses to sign at Layer 1. The executor never sees the call.",
  },
];

export function Install() {
  return (
    <Section index="05" label="INSTALL" id="install">
      <Reveal as="div" className="mb-10 md:mb-14 max-w-prose">
        <h2 className="display text-3xl md:text-4xl font-semibold text-zinc-100 mb-5">
          Self-host in two minutes.{" "}
          <span className="text-zinc-500">SDK in five.</span>
        </h2>
        <p className="text-zinc-400 leading-relaxed">
          Heimdall is MIT-licensed and ships as a Docker compose file plus two SDKs (Python and
          TypeScript). Run it locally, on Render, on your own infrastructure — the wire format is
          the same everywhere.
        </p>
      </Reveal>

      <ol className="border border-edge grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-edge">
        {STEPS.map((s, i) => (
          <Reveal as="li" key={s.n} delay={i * 120} className="p-6 md:p-7 flex flex-col">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="font-mono text-[11px] tracking-widest uppercase text-bifrost">
                § {s.n}
              </span>
              <h3 className="font-display text-base md:text-lg font-semibold text-zinc-100">
                {s.title}
              </h3>
            </div>
            <pre className="bg-slab/70 border border-edge p-4 font-mono text-[11.5px] leading-relaxed text-zinc-200 overflow-x-auto mb-4 whitespace-pre flex-1">
{s.cmd}
            </pre>
            <p className="text-[12.5px] text-zinc-500 leading-relaxed">{s.note}</p>
          </Reveal>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap items-center gap-4 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        <a
          href="https://github.com/patrick-steve/heimdall/blob/main/docs/QUICKSTART.md"
          target="_blank"
          rel="noopener"
          className="text-zinc-300 hover:text-bifrost transition-colors"
        >
          full quickstart ↗
        </a>
        <span className="text-zinc-700">/</span>
        <a
          href="https://github.com/patrick-steve/heimdall/blob/main/docs/API.md"
          target="_blank"
          rel="noopener"
          className="text-zinc-300 hover:text-bifrost transition-colors"
        >
          api reference ↗
        </a>
        <span className="text-zinc-700">/</span>
        <a
          href="https://github.com/patrick-steve/heimdall"
          target="_blank"
          rel="noopener"
          className="text-zinc-300 hover:text-bifrost transition-colors"
        >
          github ↗
        </a>
      </div>
    </Section>
  );
}
