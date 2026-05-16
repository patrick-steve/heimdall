interface Props {
  size?: number;
  className?: string;
  /** "color" renders the Google brand gradient. "mono" renders in currentColor. */
  variant?: "color" | "mono";
}

/**
 * Inline Gemini 4-pointed spark mark.
 * Public mark from Google's Gemini family; rendered as a four-pointed star
 * with the canonical Gemini gradient (#4285F4 → #9B72CB → #D96570).
 */
export function GeminiMark({ size = 16, className, variant = "color" }: Props) {
  const id = `gemini-grad-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-label="Gemini"
      role="img"
    >
      {variant === "color" && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4285F4" />
            <stop offset="55%" stopColor="#9B72CB" />
            <stop offset="100%" stopColor="#D96570" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 0 C 12 6.5, 17.5 12, 24 12 C 17.5 12, 12 17.5, 12 24 C 12 17.5, 6.5 12, 0 12 C 6.5 12, 12 6.5, 12 0 Z"
        fill={variant === "color" ? `url(#${id})` : "currentColor"}
      />
    </svg>
  );
}
