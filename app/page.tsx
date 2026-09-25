import styles from "@/components/landing/landing.module.css";
import { Pricing, FinalCta, Trust } from "@/components/landing/Closing";
import { Availability, HowItWorks, Sharing } from "@/components/landing/ContentSections";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";

/**
 * Landing page, based on docs/design/HANDOFF.md §4 with later changes: Tryghed moved up right after
 * "Sådan virker det" in its own dark band, and only the hero, Rådighed and Deler I økonomi keep product
 * cut-outs (the other features are text cards). Title, description and lang come from app/layout.tsx.
 */
export default function HomePage() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <Trust />
        <Availability />
        <Sharing />
        <Features />
        <Pricing />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
