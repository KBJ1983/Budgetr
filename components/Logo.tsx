/** budgetr mark: Pine rounded square, white house outline, green door (HANDOFF §3 Logo). */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#1F5C4A" />
      <path d="M9 21.5V14l7-5 7 5v7.5" fill="none" stroke="#F4F5F1" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M13 21.5v-4.2h6v4.2" fill="none" stroke="#6CC2A2" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ size = 30, fontSize = 22, color }: { size?: number; fontSize?: number; color?: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 10, alignItems: "center", color }}>
      <LogoMark size={size} />
      <b style={{ fontSize, letterSpacing: "-0.03em" }}>budgetr</b>
    </span>
  );
}
