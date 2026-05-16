"use client";
import { useState } from "react";

interface Props {
  size?: number;
  className?: string;
}

/**
 * Veea Lobster Trap mark.
 *
 * Tries /veea-lobstertrap.svg first, then /veea-lobstertrap.png; if neither
 * is present, falls back to a geometric stand-in that reads as "fish trap":
 * a square hull with crossed inner slats. The fallback uses currentColor.
 */
export function LobsterTrapMark({ size = 18, className }: Props) {
  const [pngFailed, setPngFailed] = useState(false);
  const [svgFailed, setSvgFailed] = useState(false);

  if (!pngFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/veea-lobstertrap.png"
        alt="Veea Lobster Trap"
        width={size}
        height={size}
        className={className}
        onError={() => setPngFailed(true)}
        style={{ display: "inline-block" }}
      />
    );
  }
  if (!svgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/veea-lobstertrap.svg"
        alt="Veea Lobster Trap"
        width={size}
        height={size}
        className={className}
        onError={() => setSvgFailed(true)}
        style={{ display: "inline-block" }}
      />
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-label="Veea Lobster Trap"
      role="img"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
    >
      <rect x="2.5" y="2.5" width="19" height="19" />
      <path d="M2.5 2.5 L21.5 21.5" />
      <path d="M21.5 2.5 L2.5 21.5" />
      <path d="M12 2.5 L12 21.5" />
      <path d="M2.5 12 L21.5 12" />
    </svg>
  );
}
