"use client";
import clsx from "clsx";
import type { Vertical } from "@/lib/plainEnglish";
import { CAST, VERTICAL_LABEL } from "@/lib/plainEnglish";

interface Props {
  vertical: Vertical;
}

const ROLE_CHIP: Record<string, string> = {
  coordinator: "CO",
  data_fetcher: "DR",
  executor: "EX",
  shadow: "SH",
};

export function Cast({ vertical }: Props) {
  const cast = CAST[vertical];
  if (cast.length === 0) return null;

  return (
    <section className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-edge flex items-baseline justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-bifrost">§ Act 1</span>
          <h2 className="font-display text-base font-semibold text-zinc-100">
            Meet the cast — {VERTICAL_LABEL[vertical]}
          </h2>
        </div>
        <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider">
          four agents · three friends, one stranger
        </span>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-edge">
        {cast.map((a) => (
          <li
            key={a.id}
            className={clsx(
              "p-5 flex flex-col",
              a.shadow && "bg-slab/40",
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={clsx(
                  "w-9 h-9 flex items-center justify-center font-mono text-[11px] font-medium",
                  a.shadow
                    ? "border border-warn/40 text-warn bg-warn/5"
                    : "border border-rune/40 text-bifrost bg-rune/10",
                )}
              >
                {ROLE_CHIP[a.role]}
              </div>
              {a.shadow ? (
                <span className="font-mono text-[10px] uppercase tracking-widest text-warn">
                  dormant
                </span>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  active
                </span>
              )}
            </div>
            <h3 className={clsx(
              "font-display text-[15px] font-semibold mb-1",
              a.shadow ? "text-zinc-300" : "text-zinc-100",
            )}>
              {a.name}
            </h3>
            <p className="text-[12.5px] text-zinc-500 leading-relaxed mb-3 min-h-[2.5em]"
               dangerouslySetInnerHTML={{ __html: a.job }} />
            <div
              className={clsx(
                "mt-auto text-[11.5px] leading-relaxed border-l-0 border-t border-edge pt-3",
              )}
            >
              <div className="eyebrow text-zinc-600 mb-1">permission</div>
              <p className="text-zinc-300 leading-snug">{a.permission}</p>
              {a.shadow && a.shadowReason && (
                <p className="text-warn/80 mt-2 text-[11px] leading-snug">
                  {a.shadowReason}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
