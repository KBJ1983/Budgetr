import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";

// The school version's type (docs/design/skole-skitse.html); the wordmark keeps the brand fonts from app/layout.tsx.
const skole = Schibsted_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-skole",
  display: "swap",
});

export const metadata: Metadata = {
  title: "budgetpro Skole – hvad koster det at være voksen?",
  description: "Lav et månedsbudget for en fremtidsperson i 8 trin. Til udskolingen.",
};

export default function SkoleLayout({ children }: { children: React.ReactNode }) {
  return <div className={skole.variable}>{children}</div>;
}
