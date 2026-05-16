"use client";
import { useEffect, useRef, useState } from "react";

const LINES = [
  "AttenuationViolation:",
  "  caller    agent-marketdata-001",
  "  callee    agent-yield-optimizer-001",
  "  scope     ['execute:trade']",
  "  parent    ['read:market_data']",
  "",
  "  → not a subset.",
  "  → credential cannot be signed.",
  "  → chain dies before broadcast.",
];

/**
 * Types out the AttenuationViolation block character-by-character when it
 * scrolls into view. ~1100ms total. The cursor blinks at the end and the
 * final ↓ line ("chain dies before broadcast.") turns red on completion.
 *
 * Lighter than the .typewriter CSS keyframe because we need a multi-line
 * staircase, not a single-line marquee.
 */
export function AttenuationCodeBlock() {
  const [armed, setArmed] = useState(false);
  const [progress, setProgress] = useState(0);
  const ref = useRef<HTMLPreElement | null>(null);

  const fullText = LINES.join("\n");
  const total = fullText.length;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setArmed(true);
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setArmed(true);
      setProgress(total);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setArmed(true);
            obs.disconnect();
            return;
          }
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [total]);

  useEffect(() => {
    if (!armed) return;
    const start = performance.now();
    const duration = 1100;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.floor(total * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [armed, total]);

  const visible = fullText.slice(0, progress);
  const done = progress >= total;

  return (
    <pre
      ref={ref}
      className="border border-edge bg-slab/70 p-5 font-mono text-[12px] leading-relaxed text-zinc-300 overflow-x-auto"
    >
      <code className="block">
        {visible || " "}
        {!done && <span className="inline-block w-[7px] h-[14px] align-middle bg-bifrost animate-pulse" />}
        {done && (
          <span
            className="block text-deny"
            style={{
              animation: "fadeIn 240ms ease-out forwards",
              opacity: 0,
            }}
          >
            {/* highlight strip rendered as plain text re-coloured */}
          </span>
        )}
      </code>
      <style>{`@keyframes fadeIn { to { opacity: 1; } }`}</style>
    </pre>
  );
}
