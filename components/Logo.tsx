/**
 * budgetpro brand (logo 11a3): the wordmark is "budget" in Bricolage Grotesque 200 + "pro" in Instrument Sans 600
 * + a green dot; the icon is the green dot alone on a dark rounded square. Sizes are in em, so the wordmark
 * scales with fontSize. The text takes the surrounding colour; `dark` picks the dot colour for dark backgrounds.
 */
const PINE = { light: "#2c6a4d", dark: "#7ed4a8" };

export function Wordmark({ fontSize = 19, dark = false }: { fontSize?: number; dark?: boolean }) {
  return (
    <span
      style={{ display: "inline-flex", alignItems: "baseline", fontSize, lineHeight: 1, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}
      aria-label="budgetpro"
      role="img"
    >
      <span aria-hidden="true" style={{ font: "200 1em/1 var(--font-brand)" }}>
        budget
      </span>
      <span aria-hidden="true" style={{ font: "600 1em/1 var(--font-brand-pro)" }}>
        pro
      </span>
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: "0.33em",
          height: "0.33em",
          marginLeft: "0.09em",
          borderRadius: "50%",
          background: dark ? PINE.dark : PINE.light,
        }}
      />
    </span>
  );
}

/** App icon: the green dot on a dark rounded square. The favicon (public/icon.svg) is the "b" icon instead. */
export function AppIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <rect width="120" height="120" rx="27" fill="#121513" />
      <circle cx="60" cy="60" r="26" fill="#7ed4a8" />
    </svg>
  );
}
