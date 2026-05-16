"use client";
import { useState } from "react";

interface Props {
  size?: number;
  className?: string;
}

/**
 * Heimdall brand mark.
 *
 * Tries /heimdall-mark.svg, then /heimdall-mark.png. If neither exists,
 * falls back to an inline glyph (aperture inside a Norse-rune frame) so
 * the nav and dashboard never show a broken icon.
 */
export function HeimdallMark({ size = 18, className }: Props) {
  const [pngFailed, setPngFailed] = useState(false);
  const [svgFailed, setSvgFailed] = useState(false);

  if (!pngFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/heimdall-mark.png"
        alt="Heimdall"
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
        src="/heimdall-mark.svg"
        alt="Heimdall"
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
      aria-label="Heimdall"
      role="img"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
    >
      <path d="M12 2 L12 22" />
      <path d="M5 6 L19 6" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 11.4 L12 12.6" />
      <path d="M5 18 L19 18" />
    </svg>
  );
}
