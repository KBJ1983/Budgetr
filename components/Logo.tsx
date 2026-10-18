/**
 * budgetpro brand ("Midnat og lime", Oct 2026, designmanual in docs/design/midnat-designmanual.html):
 * the symbol is a pocket with two cards sticking up. The front card is always lime; the back card and the pocket take the
 * colour of the name – midnight on light backgrounds, white on dark ones (on lime the front card turns white).
 * The outlines and the slot in the pocket take the background colour, so pass `bg` when the logo sits on another surface.
 * "budget" is Hanken Grotesk 700 and "pro" Hanken Grotesk 200, same colour. Sizes follow `fontSize`.
 */
export const BRAND = {
  midnight: "#0E1B2C",
  midnight2: "#1A2B42",
  lime: "#D4F26B",
  limeDark: "#9BC43A",
  olive: "#3F6A0E",
  paper: "#F3F5F7",
  limeTone: "#EEF6D2",
  haze: "#B6C0CC",
  // budgetpro Skole ("Midnat og solgul"): solgul takes lime's place; sunInk is its text colour on light backgrounds.
  sun: "#F6CF4A",
  sunDark: "#D49A1A",
  sunInk: "#7A5300",
  sunTone: "#FCF1C8",
  warm: "#F5F5F0",
} as const;

export type LogoTone = "light" | "dark" | "lime";

const TONES: Record<LogoTone, { ink: string; front: string; bg: string }> = {
  light: { ink: BRAND.midnight, front: BRAND.lime, bg: "#FFFFFF" },
  dark: { ink: "#FFFFFF", front: BRAND.lime, bg: BRAND.midnight },
  lime: { ink: BRAND.midnight, front: "#FFFFFF", bg: BRAND.lime },
};

/** The symbol alone (pocket with two cards). `size` is the height in px; `front` recolours the front card (Skole: solgul). */
export function LogoMark({ size = 32, tone = "light", bg, front }: { size?: number; tone?: LogoTone; bg?: string; front?: string }) {
  const t = TONES[tone];
  const cut = bg ?? t.bg;
  return (
    <svg viewBox="0 -2 64 64" width={size} height={size} aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <g transform="rotate(-8 22 14)">
        <rect x="6" y="0" width="32" height="22" rx="4.5" fill={t.ink} stroke={cut} strokeWidth="3" />
      </g>
      <g transform="rotate(6 42 14)">
        <rect x="25" y="2" width="32" height="22" rx="4.5" fill={front ?? t.front} stroke={cut} strokeWidth="3" />
      </g>
      <rect x="2" y="20" width="60" height="40" rx="13" fill={t.ink} stroke={cut} strokeWidth="3" />
      <rect x="40" y="35" width="15" height="8" rx="4" fill={cut} />
    </svg>
  );
}

/** Symbol + name. `dark` is a shortcut for tone "dark" (white name on midnight). */
export function Logo({
  fontSize = 22,
  tone,
  dark = false,
  bg,
  front,
}: {
  fontSize?: number;
  tone?: LogoTone;
  dark?: boolean;
  bg?: string;
  front?: string;
}) {
  const tn: LogoTone = tone ?? (dark ? "dark" : "light");
  return (
    <span
      role="img"
      aria-label="budgetpro"
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: fontSize * 0.24,
        lineHeight: 1,
        whiteSpace: "nowrap",
        color: TONES[tn].ink,
      }}
    >
      <span aria-hidden="true" style={{ alignSelf: "flex-end", marginBottom: -fontSize * 0.02 }}>
        <LogoMark size={fontSize * 1.05} tone={tn} bg={bg} front={front} />
      </span>
      <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "baseline" }}>
        <span style={{ font: `700 ${fontSize}px/1 var(--font-logo)`, letterSpacing: "-0.045em" }}>budget</span>
        <span style={{ font: `200 ${fontSize}px/1 var(--font-logo)`, letterSpacing: "-0.035em", marginLeft: fontSize * 0.03 }}>
          pro
        </span>
      </span>
    </span>
  );
}

/** App icon: the symbol in white and lime on a midnight rounded square (same as public/icon.svg). */
export function AppIcon({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size * 0.25,
        background: BRAND.midnight,
      }}
    >
      <LogoMark size={size * 0.66} tone="dark" />
    </span>
  );
}

/**
 * budgetpro Skole ("Midnat og solgul", docs/design/skole-21b.html): the budgetpro logo with a solgul front card and a
 * solgul "Skole" sticker (Hanken Grotesk 700) whose bottom edge stands on the baseline of "pro" (the bottom of the "o"). In black/white (`mono`) the sticker takes the
 * name's colour with the background colour as text.
 */
export function SkoleLogo({ fontSize = 22, dark = false, bg, mono = false }: { fontSize?: number; dark?: boolean; bg?: string; mono?: boolean }) {
  const tn: LogoTone = dark ? "dark" : "light";
  const cut = bg ?? TONES[tn].bg;
  const ink = TONES[tn].ink;
  return (
    <span role="img" aria-label="budgetpro Skole" style={{ display: "inline-flex", alignItems: "baseline", lineHeight: 1, whiteSpace: "nowrap" }}>
      <span aria-hidden="true" style={{ display: "inline-flex" }}>
        <Logo fontSize={fontSize} tone={tn} bg={bg} front={mono ? ink : BRAND.sun} />
      </span>
      {/* line-height 0 + overflow hidden: the pill's baseline is then its bottom edge, so it stands on the baseline. */}
      <span aria-hidden="true" style={{ lineHeight: 0 }}>
        <span
          style={{
            display: "inline-block",
            verticalAlign: "baseline",
            overflow: "hidden",
            marginLeft: fontSize * 0.22,
            font: `700 ${fontSize * 0.42}px/1 var(--font-logo)`,
            letterSpacing: 0,
            background: mono ? ink : BRAND.sun,
            color: mono ? cut : BRAND.midnight,
            borderRadius: 999,
            padding: `${fontSize * 0.13}px ${fontSize * 0.24}px`,
          }}
        >
          Skole
        </span>
      </span>
    </span>
  );
}

/** Skole's app icon: the symbol in white and solgul on a midnight rounded square (same as public/skole/icon.svg). */
export function SkoleAppIcon({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size * 0.25,
        background: BRAND.midnight,
      }}
    >
      <LogoMark size={size * 0.66} tone="dark" front={BRAND.sun} />
    </span>
  );
}
