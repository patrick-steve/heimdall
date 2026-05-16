"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  /** Numeric target (e.g. 88 for "88%") */
  target: number;
  /** characters appended after the number (e.g. "%") */
  suffix?: string;
  /** decimal places to render */
  decimals?: number;
  /** ms — how long the count-up takes once visible */
  duration?: number;
  /** ms — wait this long after becoming visible before counting */
  delay?: number;
  className?: string;
}

/**
 * Animates 0 → target on first entering the viewport. ease-out-expo curve,
 * 720ms default. Once started, never restarts.
 *
 * Mono-tabular by default so the digits don't jiggle in width.
 */
export function CountUp({ target, suffix = "", decimals = 0, duration = 900, delay = 0, className }: Props) {
  const [val, setVal] = useState(0);
  const [armed, setArmed] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVal(target);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setArmed(true);
            obs.disconnect();
            return;
          }
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);

  useEffect(() => {
    if (!armed || startedRef.current) return;
    startedRef.current = true;

    let raf = 0;
    const start = performance.now() + delay;

    const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const tick = (now: number) => {
      const elapsed = Math.max(0, now - start);
      const t = Math.min(1, elapsed / duration);
      setVal(target * easeOutExpo(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [armed, target, duration, delay]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}
