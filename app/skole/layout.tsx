import type { Metadata } from "next";

// budgetpro Skole ("Is og solgul", docs/design/MYNTE.md + skole-21b.html): Hanken Grotesk from app/layout.tsx for the text and the logo.
export const metadata: Metadata = {
  title: "budgetpro Skole – hvad koster det at være voksen?",
  description: "Lav et månedsbudget for en fremtidsperson i 8 trin. Til udskolingen.",
  icons: { icon: "/skole/icon.svg" },
};

export default function SkoleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
