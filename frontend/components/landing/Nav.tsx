import Link from "next/link";
import { HeimdallMark } from "./marks/HeimdallMark";

export function Nav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-edge bg-ink/85 backdrop-blur supports-[backdrop-filter]:bg-ink/70">
      <div className="mx-auto max-w-page_wide px-6 md:px-12 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-bifrost hover:text-glacier transition-colors duration-150"
          >
            <HeimdallMark size={20} className="shrink-0" />
            <span className="font-display text-lg font-bold tracking-tight">Heimdall</span>
          </Link>
          <span className="hidden md:inline font-mono text-[11px] text-zinc-600">v0.1</span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="font-mono text-[11px] uppercase tracking-wider text-zinc-300 hover:text-bifrost transition-colors duration-150"
          >
            Dashboard
          </Link>
          <a
            href="https://github.com/veeainc/lobstertrap"
            target="_blank"
            rel="noopener"
            className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 hover:text-bifrost transition-colors duration-150 hidden sm:inline"
          >
            Lobster Trap ↗
          </a>
          <Link
            href="/dashboard"
            className="font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-sm bg-rune/15 border border-rune/40 text-bifrost hover:bg-rune/25 transition"
          >
            Open watchpost
          </Link>
        </div>
      </div>
    </nav>
  );
}
