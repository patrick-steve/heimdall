import Link from "next/link";

export function Close() {
  return (
    <section className="py-32 md:py-48 border-t border-edge">
      <div className="mx-auto max-w-page_wide px-6 md:px-12">
        <div className="grid grid-cols-12 gap-8 items-end mb-16">
          <div className="col-span-12 md:col-span-8">
            <div className="eyebrow text-zinc-600 mb-6">§ 06 / NEXT</div>
            <h2 className="display text-4xl md:text-6xl font-bold text-zinc-100 mb-8 leading-[0.95]">
              Watch a chain die<br />
              at <span className="text-bifrost">Layer 01</span>.
            </h2>
            <p className="max-w-prose text-lg text-zinc-400 leading-relaxed">
              The dashboard is a live watchpost. Run the routine scenario, then the rebalance, then the
              attack. Six rule cards stack in the sidebar as the attack dies at the protocol boundary,
              before the executor sees a thing.
            </p>
          </div>
          <div className="col-span-12 md:col-span-4 md:text-right">
            <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-600 block mb-2">tagline</span>
            <p className="font-display text-2xl md:text-3xl text-zinc-300 leading-tight">
              Nothing crosses<br />without being seen.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-24">
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
            href="https://github.com/veeainc/lobstertrap"
            target="_blank"
            rel="noopener"
            className="font-mono text-[12px] uppercase tracking-wider border border-edge hover:border-edgeHi text-zinc-300 px-5 py-3 transition"
          >
            Veea Lobster Trap ↗
          </a>
        </div>

        <div className="hairline mb-8" />
        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-8 font-mono text-[11px] text-zinc-500 uppercase tracking-wider">
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            <span>Heimdall · 2026</span>
            <span>MIT license</span>
            <span>built on veea lobster trap</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <Link href="/dashboard" className="hover:text-bifrost transition-colors">/dashboard</Link>
            <a href="#problem" className="hover:text-bifrost transition-colors">/problem</a>
            <a href="#architecture" className="hover:text-bifrost transition-colors">/architecture</a>
            <a href="#verticals" className="hover:text-bifrost transition-colors">/verticals</a>
          </div>
        </div>
      </div>
    </section>
  );
}
