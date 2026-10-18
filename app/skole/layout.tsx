import type { Metadata } from "next";

// budgetpro Skole ("Midnat og solgul", docs/design/skole-21b.html): Geist from app/layout.tsx for the text, Hanken Grotesk only in the logo.
export const metadata: Metadata = {
  title: "budgetpro Skole – hvad koster det at være voksen?",
  description: "Lav et månedsbudget for en fremtidsperson i 8 trin. Til udskolingen.",
  icons: { icon: "/skole/icon.svg" },
};

export default function SkoleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
