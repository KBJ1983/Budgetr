import styles from "@/components/landing/landing.module.css";
import { Pricing, FinalCta, Trust } from "@/components/landing/Closing";
import { Availability, HowItWorks, Loans, Sharing } from "@/components/landing/ContentSections";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";

/** Landing page (docs/design/HANDOFF.md §4). Title, description and lang come from app/layout.tsx. */
export default function HomePage() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <Availability />
        <Sharing />
        <Loans />
        <Features />
        <Trust />
        <Pricing />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
