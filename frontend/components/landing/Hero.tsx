import Link from "next/link";
import { ChainPulse } from "./ChainPulse";
import { LiveStatusPanel } from "./LiveStatusPanel";
import { GeminiMark } from "./marks/GeminiMark";
import { LobsterTrapMark } from "./marks/LobsterTrapMark";

export function Hero() {
  return (
    <header className="relative overflow-hidden">
      {/* Optional grain backdrop. Drop public/grain.png to enable. */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage: "url(/grain.png)",
          backgroundRepeat: "repeat",
          backgroundSize: "512px 512px",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-page_wide px-6 md:px-12 pt-14 md:pt-20 pb-16 md:pb-24">
        <div className="grid grid-cols-12 gap-8 md:gap-16">
          <div className="col-span-12 md:col-span-8">
            <div className="eyebrow mb-6 inline-flex items-center gap-3">
              <span className="inline-block w-1.5 h-1.5 bg-allow animate-pulse_soft" />
              <span className="text-bifrost">§ 00</span>
              <span className="text-zinc-700">/</span>
              HEIMDALL · 2026
            </div>
            <h1 className="display font-bold text-4xl md:text-6xl lg:text-7xl text-zinc-100 mb-6 animate-rise">
              Nothing crosses<br className="hidden md:inline" /> without being seen.
            </h1>
            <p className="max-w-prose text-lg md:text-xl text-zinc-300 leading-snug mb-4">
              AI agents now sign transactions, write to patient records, and call each other in long
              chains. Nobody verifies the authority moving through those chains.{" "}
              <span className="text-bifrost">Heimdall does.</span>
            </p>
            <p className="max-w-prose text-[15px] text-zinc-500 leading-relaxed mb-8">
              Two layers, one mechanism. At the protocol boundary, credentials can only weaken across
              hops, never strengthen, so a class of attacks is unrepresentable. At the policy boundary,
              six rule primitives expressed as YAML catch everything else. Built on Veea Lobster Trap.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-3 bg-rune hover:bg-rune/90 text-white font-mono text-[12px] uppercase tracking-wider px-5 py-3 transition"
              >
                Open the dashboard
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none" className="transition-transform duration-150 group-hover:translate-x-0.5">
                  <path d="M1 5h12M9 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <a
                href="#architecture"
                className="font-mono text-[12px] uppercase tracking-wider border border-edge hover:border-edgeHi text-zinc-300 px-5 py-3 transition"
              >
                Read the architecture
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              <span>Built with</span>
              <a
                href="https://github.com/veeainc/lobstertrap"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 text-zinc-300 hover:text-bifrost transition-colors duration-150"
              >
                <LobsterTrapMark size={14} />
                Veea Lobster Trap
              </a>
              <span className="text-zinc-700">·</span>
              <a
                href="https://ai.google.dev/gemini-api"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 text-zinc-300 hover:text-bifrost transition-colors duration-150"
              >
                <GeminiMark size={14} />
                Google Gemini
              </a>
            </div>

            <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-8 max-w-2xl">
              <div>
                <dt className="eyebrow text-zinc-600 mb-1.5">Layers</dt>
                <dd className="font-mono text-[13px] text-zinc-300">2</dd>
              </div>
              <div>
                <dt className="eyebrow text-zinc-600 mb-1.5">Primitives</dt>
                <dd className="font-mono text-[13px] text-zinc-300">6</dd>
              </div>
              <div>
                <dt className="eyebrow text-zinc-600 mb-1.5">Verticals</dt>
                <dd className="font-mono text-[13px] text-zinc-300">3</dd>
              </div>
              <div>
                <dt className="eyebrow text-zinc-600 mb-1.5">License</dt>
                <dd className="font-mono text-[13px] text-zinc-300">MIT</dd>
              </div>
            </dl>
          </div>

          <aside className="col-span-12 md:col-span-4 md:pt-2 space-y-6">
            <LiveStatusPanel />
            <div className="border border-edge bg-slab/40">
              <ChainPulse />
            </div>
          </aside>
        </div>
      </div>
    </header>
  );
}
