import Link from "next/link";
import { GeminiMark } from "./marks/GeminiMark";
import { LobsterTrapMark } from "./marks/LobsterTrapMark";

interface Item {
  name: string;
  role: string;
  href: string;
  external?: boolean;
  Mark: React.ComponentType<{ size?: number; className?: string }>;
}

const ITEMS: Item[] = [
  {
    name: "Veea Lobster Trap",
    role: "DPI proxy at the model boundary",
    href: "https://github.com/veeainc/lobstertrap",
    external: true,
    Mark: LobsterTrapMark,
  },
  {
    name: "Google Gemini",
    role: "agent reasoning + incident report streaming",
    href: "https://ai.google.dev/gemini-api",
    external: true,
    Mark: GeminiMark,
  },
];

export function Attestations() {
  return (
    <section className="border-y border-edge bg-slab/30">
      <div className="mx-auto max-w-page_wide px-6 md:px-12 py-10 md:py-14">
        <div className="grid grid-cols-12 gap-8 items-start">
          <div className="col-span-12 md:col-span-3">
            <div className="eyebrow text-zinc-500">Built with</div>
          </div>
          <div className="col-span-12 md:col-span-9">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
              {ITEMS.map(({ name, role, href, external, Mark }) => (
                <li key={name}>
                  <a
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener" : undefined}
                    className="group flex items-start gap-4"
                  >
                    <span className="shrink-0 mt-0.5 text-zinc-300 group-hover:text-bifrost transition-colors duration-150">
                      <Mark size={22} />
                    </span>
                    <span className="flex-1">
                      <span className="block font-display text-base md:text-lg font-semibold text-zinc-100 group-hover:text-bifrost transition-colors duration-150">
                        {name}
                        {external && (
                          <span className="text-zinc-600 group-hover:text-bifrost ml-2 text-xs align-middle">↗</span>
                        )}
                      </span>
                      <span className="block font-mono text-[11px] uppercase tracking-wider text-zinc-500 mt-1">
                        {role}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
