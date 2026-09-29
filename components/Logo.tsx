/**
 * budgetpro brand ("Skov" design): the wordmark is "budget" with a small PRO badge, the icon is a dark
 * rounded square with a "b" and a green dot. Sizes are in em, so the wordmark scales with fontSize.
 */
const PINE = { light: "#2c6a4d", dark: "#7ed4a8" };

export function Wordmark({ fontSize = 19, dark = false }: { fontSize?: number; dark?: boolean }) {
  return (
    <span
      style={{ font: `700 ${fontSize}px/1 var(--font)`, letterSpacing: "-0.03em", whiteSpace: "nowrap" }}
      aria-label="budgetpro"
      role="img"
    >
      budget
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          verticalAlign: "baseline",
          boxSizing: "border-box",
          font: "700 0.3em/1.35 var(--font)",
          height: "1.75em",
          marginLeft: "0.7em",
          padding: "0.2em 0.42em 0 0.58em",
          letterSpacing: "0.12em",
          borderRadius: "0.34em",
          color: dark ? "#0e1a13" : "#ffffff",
          background: dark ? PINE.dark : PINE.light,
        }}
      >
        PRO
      </span>
    </span>
  );
}

/** App icon: "b" drawn as paths so it looks the same without the web font (also used for public/icon.svg). */
export function AppIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <rect width="120" height="120" rx="27" fill="#121513" />
      <path d="M22 22h15v72H22z" fill="#e9ece9" />
      <circle cx="55" cy="70" r="19" fill="none" stroke="#e9ece9" strokeWidth="15" />
      <rect x="84" y="78" width="16" height="16" rx="4" fill="#7ed4a8" />
    </svg>
  );
}
