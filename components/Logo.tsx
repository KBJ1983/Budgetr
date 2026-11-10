/**
 * budgetpro brand ("A6", Nov 2026): the symbol is a pocket with two upright cards. The logo never uses the blue
 * (user's wish): on light backgrounds the whole logo is graphite, in negative (on dark) the whole logo is white, and the
 * app icon is the white symbol on an ultraviolet square. The outlines and the slot in the pocket take the background colour, so pass `bg` when
 * the logo sits on another surface. "budget" is Hanken Grotesk 700 and "pro" Hanken Grotesk 200, same colour. Sizes
 * follow `fontSize`. The older keys keep their names (midnight = blæk, lime = mynte, olive = dyb mynte); Skole keeps
 * its own logo (blæk with a solgul front card).
 */
export const BRAND = {
  midnight: "#101415",
  midnight2: "#181D1E",
  lime: "#A9DCCB",
  limeDark: "#7CC1AA",
  olive: "#2E6E5B",
  paper: "#F0F3F2",
  // Mynte tint: the website's Funktioner band.
  tint: "#DDF0E8",
  // Warm paper white: the website's hero card (header + hero).
  mist: "#F2F0EA",
  // Smørgul: the complementary accent (red is for errors only).
  comp: "#F4DE96",
  limeTone: "#E3F2EC",
  haze: "#99A5A3",
  snow: "#ECF1F0",
  // budgetpro Skole ("Mynte og is" with solgul): solgul takes mynte's place; sunInk is its text colour on light backgrounds.
  sun: "#F6CF4A",
  sunDark: "#D49A1A",
  sunInk: "#7A5300",
  sunTone: "#FCF1C8",
  warm: "#F5F5F0",
  // "Petrol og sand" (before A6): kept for history.
  petrol: "#1E6670",
  petrolDeep: "#0E373D",
  sand: "#E6C987",
  // "A6" (Nov 2026, current): graphite for the logo and the dark parts, ultraviolet for the front card and buttons,
  // the dark graphite of the website's bands (and the app's dark theme), rosa only for small details.
  graphite: "#18181B",
  violet: "#5B3DF5",
  dark: "#202024",
  stone: "#F3F3F1",
  rosa: "#FF9FCF",
} as const;

export type LogoTone = "light" | "dark" | "lime";

const TONES: Record<LogoTone, { ink: string; front: string; bg: string }> = {
  light: { ink: BRAND.graphite, front: BRAND.graphite, bg: "#FFFFFF" },
  dark: { ink: "#FFFFFF", front: "#FFFFFF", bg: BRAND.dark },
  lime: { ink: BRAND.graphite, front: "#FFFFFF", bg: BRAND.lime },
};

/**
 * The symbol alone (pocket with two cards). `size` is the height in px; `front` recolours the front card and `ink` the
 * pocket and back card (Skole: blæk with solgul).
 */
export function LogoMark({ size = 32, tone = "light", bg, front, ink }: { size?: number; tone?: LogoTone; bg?: string; front?: string; ink?: string }) {
  const t = TONES[tone];
  const cut = bg ?? t.bg;
  const body = ink ?? t.ink;
  return (
    <svg viewBox="0.5 1.5 63 60" width={(size * 63) / 60} height={size} aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <rect x="9" y="3" width="34" height="22" rx="5" fill={body} stroke={cut} strokeWidth="3" />
      <rect x="21" y="8" width="34" height="22" rx="5" fill={front ?? t.front} stroke={cut} strokeWidth="3" />
      <rect x="2" y="19" width="60" height="41" rx="13" fill={body} stroke={cut} strokeWidth="3" />
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
  ink,
}: {
  fontSize?: number;
  tone?: LogoTone;
  dark?: boolean;
  bg?: string;
  front?: string;
  ink?: string;
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
        color: ink ?? TONES[tn].ink,
      }}
    >
      <span aria-hidden="true" style={{ alignSelf: "flex-end", marginBottom: -fontSize * 0.02 }}>
        <LogoMark size={fontSize * 1.05} tone={tn} bg={bg} front={front} ink={ink} />
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

/** App icon: the symbol in white on an ultraviolet rounded square (same as public/icon.svg). */
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
        background: BRAND.violet,
      }}
    >
      <LogoMark size={size * 0.66} tone="dark" bg={BRAND.violet} />
    </span>
  );
}

/**
 * budgetpro Skole ("Is og solgul", docs/design/skole-21b.html): the budgetpro logo with a solgul front card and a
 * solgul "Skole" sticker (Hanken Grotesk 700) whose bottom edge stands on the baseline of "pro" (the bottom of the "o"). In black/white (`mono`) the sticker takes the
 * name's colour with the background colour as text.
 */
export function SkoleLogo({ fontSize = 22, dark = false, bg, mono = false }: { fontSize?: number; dark?: boolean; bg?: string; mono?: boolean }) {
  const tn: LogoTone = dark ? "dark" : "light";
  const cut = bg ?? (dark ? BRAND.midnight : "#FFFFFF");
  const ink = dark ? BRAND.snow : BRAND.midnight;
  return (
    <span role="img" aria-label="budgetpro Skole" style={{ display: "inline-flex", alignItems: "baseline", lineHeight: 1, whiteSpace: "nowrap" }}>
      <span aria-hidden="true" style={{ display: "inline-flex" }}>
        <Logo fontSize={fontSize} tone={tn} bg={bg ?? (dark ? BRAND.midnight : "#FFFFFF")} front={mono ? ink : BRAND.sun} ink={ink} />
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
      <LogoMark size={size * 0.66} tone="dark" bg={BRAND.midnight} front={BRAND.sun} ink={BRAND.snow} />
    </span>
  );
}
