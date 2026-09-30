import styles from "@/components/landing/landing.module.css";
import { FinalCta, Pricing, Quotes, Trust } from "@/components/landing/Closing";
import { Availability, HowItWorks, Notifications, Sharing } from "@/components/landing/ContentSections";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";

/**
 * Landing page, layout from docs/design/forside-v2.html ("Forside v2"): header and hero share a dark rounded card,
 * Tryghed follows "Sådan virker det", and the product is shown with real screenshots (`pnpm shots`), not mock-ups.
 * Beskeder og påmindelser is our own addition to the design. Title, description and lang come from app/layout.tsx.
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
        <Notifications />
        <Quotes />
        <Features />
        <Pricing />
        <FinalCta />
      </main>
      <SiteFooter />
      <ScrollReveal />
    </div>
  );
}
