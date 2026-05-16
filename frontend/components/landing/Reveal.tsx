"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** ms to wait after the element becomes visible before starting the reveal */
  delay?: number;
  /** how far to translate up before settling, in px */
  distance?: number;
  /** override the wrapping element */
  as?: keyof React.JSX.IntrinsicElements;
  /** extra classes applied to the wrapper at all times */
  className?: string;
}

/**
 * Wraps children with an opacity + translateY reveal that fires once when
 * the element first enters the viewport. Uses IntersectionObserver. Falls
 * back to immediate-visible if IO isn't available (server-rendered).
 *
 * Hardcoded easing: ease-out-expo. 720ms. Never animates layout.
 */
export function Reveal({ children, delay = 0, distance = 12, as = "div", className }: Props) {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const t = setTimeout(() => setShown(true), delay);
            obs.disconnect();
            return () => clearTimeout(t);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  const Tag = as as keyof React.JSX.IntrinsicElements;
  const style: React.CSSProperties = {
    opacity: shown ? 1 : 0,
    transform: shown ? "translate3d(0,0,0)" : `translate3d(0,${distance}px,0)`,
    transition: "opacity 720ms cubic-bezier(0.16,1,0.3,1), transform 720ms cubic-bezier(0.16,1,0.3,1)",
    willChange: "opacity, transform",
  };
  return (
    // @ts-expect-error: typed-as union
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}
