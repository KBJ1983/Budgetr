import type { Metadata } from "next";

// budgetpro Skole ("Is og solgul", docs/design/MYNTE.md + skole-21b.html) keeps Hanken Grotesk for the text and the logo:
// the main site moved to Plus Jakarta Sans (A6), so --font-text is pointed back at Hanken (loaded in app/layout.tsx) here.
export const metadata: Metadata = {
  title: "budgetpro Skole – hvad koster det at være voksen?",
  description: "Lav et månedsbudget for en fremtidsperson i 8 trin. Til udskolingen.",
  icons: { icon: "/skole/icon.svg" },
};

export default function SkoleLayout({ children }: { children: React.ReactNode }) {
  const font = { display: "contents", "--font-text": "var(--font-logo-face)" } as React.CSSProperties;
  return <div style={font}>{children}</div>;
}
