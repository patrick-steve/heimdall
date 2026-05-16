"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface Props {
  /** Section number e.g. "01" */
  index?: string;
  /** Small uppercase label after the section number */
  label?: string;
  /** Optional id for in-page anchoring */
  id?: string;
  /** Section vertical rhythm — default ample */
  spacing?: "default" | "tight";
  children: ReactNode;
}

/**
 * Section wrapper for the landing page.
 *
 * Renders a hairline rule, a numbered eyebrow label (§ 01 / PROBLEM), and the
 * section content within the page's outer container.  When the section first
 * enters the viewport, the hairline draws from left to right (scaleX 0 → 1)
 * and the eyebrow label fades in.
 */
export function Section({ index, label, id, spacing = "default", children }: Props) {
  const padY = spacing === "tight" ? "py-12 md:py-16" : "py-16 md:py-24";
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setDrawn(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setDrawn(true);
            obs.disconnect();
            return;
          }
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id={id} className={`${padY}`}>
      <div className="mx-auto max-w-page_wide px-6 md:px-12">
        {(index || label) && (
          <div ref={headerRef} className="flex items-center gap-4 mb-8 md:mb-12">
            <div className={`hairline flex-1 ${drawn ? "hairline-draw" : ""}`} style={{ transform: drawn ? undefined : "scaleX(0)" }} />
            <span
              className="eyebrow whitespace-nowrap"
              style={{
                opacity: drawn ? 1 : 0,
                transition: "opacity 720ms cubic-bezier(0.16,1,0.3,1) 240ms",
              }}
            >
              {index && <span className="text-bifrost">§ {index}</span>}
              {index && label && <span className="text-zinc-700 mx-2">/</span>}
              {label}
            </span>
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
